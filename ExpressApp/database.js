const fs = require("fs");

function setupPostgreSQL(client, database) {
    console.log('Connected to PostgreSQL database');

    ensureDatabaseExists(database, client)
        .then(() => ensureTableExists("Document_Table", './sql/document_table.sql', client))
        .then(() => ensureTableExists("Selection_Table", './sql/selection_table.sql', client))
        .then(() => console.log('All tables set up successfully'))
}

//Can never fail because Pool connect to database has been set.
function ensureDatabaseExists(dbName, client) {
    return new Promise(async (resolve, reject) => {
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist.`);
            reject();
        } else {
            console.log(`Database ${dbName} already exists.`);
            resolve();
        }
    });
}

async function getDocumentFromDatabase(client, documentUUID) {
    const res = await client.query(`SELECT
    d."Document_UUID" as "documentUUID",
    "Document_Base64" as "pdfBase64",
    COALESCE(json_agg(
             json_build_object(
                     'Selection_UUID', s."Selection_UUID",
                     'isCompleted', s."isCompleted")
                 ) FILTER (WHERE s."Selection_UUID" IS NOT NULL),'[]'::json) AS selection_data
    FROM selection_table s
            RIGHT JOIN document_table d ON s."Document_UUID" = d."Document_UUID"
    WHERE d."Document_UUID" = $1
    GROUP BY d."Document_UUID";
`, [documentUUID]);

    if (res.rowCount === 0) {
        throw new Error(`${documentUUID} does not exist`);
    }

    return res.rows[0];
}

async function updateWords(client, documentUUID, selectionUUID, pageWords) {
    return client.query(`update selection_table set "Page_Words" = $1 where "Document_UUID" = $2 and "Selection_UUID" = $3`, [pageWords, documentUUID, selectionUUID]);
}

async function updateIsComplete(client, documentUUID, selectionUUID, isComplete = false) {
    return client.query(`update selection_table set "isCompleted" = $1 where "Document_UUID" = $2 and "Selection_UUID" = $3`, [isComplete, documentUUID, selectionUUID]);
}

function ensureTableExists(tableName, filePath, client) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Creating table if not exists ${tableName}`);
            await runSQLFile(client, filePath);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function addDocumentToTable(client, documentUUID, documentBase64) {
    return client.query("INSERT INTO public.document_table VALUES ($1, $2)", [documentUUID, documentBase64]);
}

function addSelectionTotable(client, documentUUID, selectionUUID, selectionBounds = {}, pageWords = {}, settings = {}, isComplete = false) {
    const insertToDocumentTable = `INSERT INTO job_store.public.selection_table ("Selection_UUID", "Document_UUID", "Selection_bounds", "Page_Words", "Settings", "isCompleted") values ($1, $2, $3, $4, $5, $6)`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [selectionUUID, documentUUID, selectionBounds, pageWords, settings, isComplete])
            .then(resolve)
            .catch(reject);
    });
}

function runSQLFile(client, filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, sql) => {
            if (err) {
                return reject(err);
            }

            client.query(sql)
                .then(resolve)
                .catch(reject);
        });
    });
}

function getSelectionFromUUID(client, docUUID, selUUID) {
    const insertToDocumentTable = `SELECT * FROM job_store.public.selection_table WHERE "Document_UUID" = $1 AND "Selection_UUID" = $2`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [docUUID, selUUID])
            .then((res) => {
                resolve(res);
            })
            .catch(reject);
    })
}

function getisCompletedSelectionFromUUID(client, docUUID, selUUID) {
    const insertToDocumentTable = `SELECT "Selection_UUID", "Document_UUID", "isCompleted" FROM job_store.public.selection_table WHERE "Document_UUID" = $1 AND "Selection_UUID" = $2`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [docUUID, selUUID])
            .then((res) => {
                resolve(res);
            })
            .catch(reject);
    })
}


module.exports = {
    setupPostgreSQL,
    addDocumentToTable,
    addSelectionTotable,
    getSelectionFromUUID,
    getDocumentFromDatabase,
    updateWords,
    updateIsComplete,
    getisCompletedSelectionFromUUID
};
