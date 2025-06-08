//index.js
import express from 'express';
import { setupPostgreSQL } from './database';
import { configureEukera } from './eukeka';
import { logErrors, errorHandler } from './errorhandle';
import { upload } from './controllers/upload';
import { extract } from './controllers/management';
import { status } from './controllers/status';
import { imageCallback, extractionCallback } from './controllers/callback';
import { getDocument, getSelection } from './controllers/document';
import { getPool } from './dbPool';

const app = express();
app.use(express.json({ limit: '20mb' })); // Increase JSON body size limit
app.get('/api/pdf/:documentUUID', getDocument);
app.get('/api/pdf/status/:documentUUID/:selectionUUID', status);
app.get('/api/pdf/:documentUUID/:selectionUUID', getSelection);
app.post('/api/pdf/upload', upload);
app.post('/api/pdf/extract', extract);
app.post('/webhook/pdf/image/:documentUUID/', imageCallback);
app.post('/webhook/pdf/extraction/:documentUUID/:selectionUUID', extractionCallback);

app.listen(process.env.EXPRESS_PORT, async () => {
	let client = await getPool().connect();
	await setupPostgreSQL(client, process.env.POSTGRES_DATABASE);
	await configureEukera();
	console.log(`server listening on port ${process.env.EXPRESS_PORT}`)
	await client.release();
});

app.on('close', () => {
	console.log('Closing PostgreSQL pool...');
	getPool().end(() => {
		console.log('PostgreSQL pool closed.');
		process.exit(0);
	});
});

app.use(logErrors);
app.use(errorHandler);
