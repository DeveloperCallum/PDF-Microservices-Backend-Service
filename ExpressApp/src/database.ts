import fs from 'fs';
import { Pool, PoolClient, QueryResult } from 'pg';

export function setupPostgreSQL(client: any, database: any) {
    console.log('Connected to PostgreSQL database');

    ensureDatabaseExists(database, client)
        .then(() => ensureTableExists("Document_Table", './sql/document_table.sql', client))
        .then(() => ensureTableExists("Selection_Table", './sql/selection_table.sql', client))
        .then(() => console.log('All tables set up successfully'))
}

//Can never fail because Pool connect to database has been set.
export function ensureDatabaseExists(dbName: any, client: any) {
    return new Promise<void>(async (resolve, reject) => {
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

export async function getDocumentFromDatabase(client: any, documentUUID: any) {
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

export async function updateWords(client: any, documentUUID: any, selectionUUID: any, pageWords: any) {
    return client.query(`update selection_table set "Page_Words" = $1 where "Document_UUID" = $2 and "Selection_UUID" = $3`, [pageWords, documentUUID, selectionUUID]);
}

export async function updateIsComplete(client: any, documentUUID: any, selectionUUID: any, isComplete = false) {
    return client.query(`update selection_table set "isCompleted" = $1 where "Document_UUID" = $2 and "Selection_UUID" = $3`, [isComplete, documentUUID, selectionUUID]);
}

export function ensureTableExists(tableName: any, filePath: any, client: any) {
    return new Promise<void>(async (resolve, reject) => {
        try {
            console.log(`Creating table if not exists ${tableName}`);
            await runSQLFile(client, filePath);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export async function addDocumentToTable(client: any, documentUUID: any, documentBase64: any) {
    return client.query("INSERT INTO public.document_table VALUES ($1, $2)", [documentUUID, documentBase64]);
}

export function addSelectionTotable(client: any, documentUUID: any, selectionUUID: any, selectionBounds = {}, pageWords = {}, settings = {}, isComplete = false) {
    const insertToDocumentTable = `INSERT INTO job_store.public.selection_table ("Selection_UUID", "Document_UUID", "Selection_bounds", "Page_Words", "Settings", "isCompleted") values ($1, $2, $3, $4, $5, $6)`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [selectionUUID, documentUUID, selectionBounds, pageWords, settings, isComplete])
            .then(resolve)
            .catch(reject);
    });
}

export function runSQLFile(client: any, filePath: any) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err: any, sql: any) => {
            if (err) {
                return reject(err);
            }

            client.query(sql)
                .then(resolve)
                .catch(reject);
        });
    });
}

//Each should be unquie.
export function getSelectionFromUUID(client: any, docUUID: any, selUUID: any) {
    const insertToDocumentTable = `SELECT * FROM job_store.public.selection_table WHERE "Document_UUID" = $1 AND "Selection_UUID" = $2`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [docUUID, selUUID])
            .then((res: any) => {
                if (res.rows.length == 0) {
                    throw new Error("No results!")
                }

                resolve(res.rows[0]);
            })
            .catch(reject);
    })
}

export function getisCompletedSelectionFromUUID(client: any, docUUID: any, selUUID: any) {
    const insertToDocumentTable = `SELECT "Selection_UUID", "Document_UUID", "isCompleted" FROM job_store.public.selection_table WHERE "Document_UUID" = $1 AND "Selection_UUID" = $2`;

    return new Promise((resolve, reject) => {
        client.query(insertToDocumentTable, [docUUID, selUUID])
            .then((res: any) => {
                resolve(res);
            })
            .catch(reject);
    })
}

export async function setDocumentMetaFromDatabase(client: PoolClient, documentUUID: string, imageMeta: ImageMeta): Promise<QueryResult<any>> {
    const updateTable = 'insert into documentmeta_table ("Document_UUID", "Height", "Width", "Number_Of_Pages") values ($1, $2, $3, $4)';

    return await client.query(updateTable, [documentUUID, imageMeta.height, imageMeta.width, imageMeta.numberOfPages]);
}

export interface ImageMeta {
    height: number;
    width: number;
    numberOfPages: number;
}

export interface DocumentMeta {
    documentUUID: string;
    imageMeta?: ImageMeta;
    images?: any;
}

export async function getDocumentMetaFromDatabase(client: PoolClient, documentUUID: string): Promise<DocumentMeta | undefined> {
    const updateTable = 'select "Document_UUID" as "documentUUID", "Height" as "height", "Width" as "width", "Number_Of_Pages" as "numberOfPages", "Images" as "images" from documentmeta_table where "Document_UUID" = $1';

    const res = await client.query(updateTable, [documentUUID]);

    if (res.rows.length == 0) {
        return undefined;
    }

    let height = res.rows[0]?.height;
    let width = res.rows[0]?.width;
    let numberOfPages = res.rows[0]?.numberOfPages;
    let images = res.rows[0]?.images;

    let meta: DocumentMeta = {
        documentUUID: documentUUID,
        imageMeta: {
            height: height,
            width: width,
            numberOfPages: numberOfPages,
        },
        images: images,
    }

    return meta;
}