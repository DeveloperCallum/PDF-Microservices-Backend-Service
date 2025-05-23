const fs = require("fs");

function setupPostgreSQL(client, database) {
    console.log('Connected to PostgreSQL database');

    ensureDatabaseExists(database, client)
        .then(() => ensureTableExists("Document_Table", './sql/document_table.sql', client))
        .then(() => ensureTableExists("Extraction_Method_Table", './sql/extraction_method_table.sql', client))
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

function addDocumentToTable(client, documentUUID, documentBase64) {
    const insertToDocumentTable = "INSERT INTO job_store.public.document_table VALUES ($1, $2)"

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [documentUUID, documentBase64])
            .then(resolve)
            .catch(reject);
    })
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

function getDatabaseFromUUID(client, uuid){
        const insertToDocumentTable = `SELECT * FROM job_store.public.document_table WHERE "Document_UUID" = $1`;

        return new Promise((resolve, reject) => {
            client.query(insertToDocumentTable, [uuid])
                .then((res) => {
                    resolve(res);
                })
                .catch(reject);
        })
}

function getSelectionFromUUID(client, docUUID, selUUID){
        const insertToDocumentTable = `SELECT * FROM job_store.public.selection_table WHERE "Document_UUID" = $1 AND "Selection_UUID" = $2`;

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
    getDatabaseFromUUID,
    getSelectionFromUUID
};
