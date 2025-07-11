//index.js
import logger  from './logger';
import express from 'express';
import { setupPostgreSQL } from './database';
import { configureEukera } from './eukrea';
import { logErrors, errorHandler } from './errorhandle';
import { upload } from './controllers/upload';
import { extract } from './controllers/management';
import { status } from './controllers/status';
import { imageCallback, extractionCallback, metaCallback } from './controllers/callback';
import { getDocument, getDocumentMeta, getSelection } from './controllers/document';
import { getPool } from './dbPool';
import { getImage } from './controllers/image';
import { setTraceID } from './controllers/middleware';

const app = express();
app.use(setTraceID);
app.use(express.json({ limit: '20mb' })); // Increase JSON body size limit
app.get('/api/pdf/:documentUUID', getDocument);
app.get('/api/pdf/status/:documentUUID/:selectionUUID', status);
app.get('/api/pdf/:documentUUID/:selectionUUID', getSelection);
app.get('/api/pdf/document/meta/:documentUUID', getDocumentMeta);
app.post('/api/pdf/upload', upload);
app.post('/api/pdf/extract', extract);
app.post('/webhook/pdf/image/:documentUUID/', imageCallback);
app.post('/webhook/pdf/extraction/:documentUUID/:selectionUUID', extractionCallback);
app.post('/webhook/pdf/documentmeta/:documentUUID', metaCallback);
app.post('/api/pdf/image', getImage);

app.listen(process.env.EXPRESS_PORT, async () => {
	let client = await getPool().connect();
	await setupPostgreSQL(client, process.env.POSTGRES_DATABASE);
	await configureEukera();
	logger.info({message: `server listening on port ${process.env.EXPRESS_PORT}`})
	await client.release();
});

app.on('close', () => {
	logger.info({message: `Closing PostgreSQL pool...`})
	getPool().end(() => {
		logger.info({message: `PostgreSQL pool closed.`})
		process.exit(0);
	});
});

app.use(logErrors);
app.use(errorHandler);
