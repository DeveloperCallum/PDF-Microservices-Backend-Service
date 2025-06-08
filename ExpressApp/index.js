//index.js
const { Pool, Client } = require('pg');
const express = require('express');
const { setupPostgreSQL, addSelectionTotable, addDocumentToTable, getDocumentFromDatabase, getSelectionFromUUID, updateWords, updateIsComplete, getisCompletedSelectionFromUUID } = require('./database');
const { configureEukera, getServiceUrl } = require('./eukeka')
const http = require("http");
const axios = require('axios');
const { logErrors, errorHandler } = require('./errorhandle');
const uuidv4 = require('uuid').v4

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const serviceName = process.env.EUREKA_APP_NAME;

const handleError = (e, res) => {
	res.statusCode = 500;
	res.json(e);
}

const pool = new Pool({
	user: process.env.POSTGRES_USERNAME,
	password: process.env.POSTGRES_PASSWORD,
	host: process.env.POSTGRES_HOST || 'postgres',
	port: process.env.POSTGRES_PORT || '5432',
	database: process.env.POSTGRES_DATABASE || 'job_store',
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
})

const app = express();
app.use(express.json({ limit: '20mb' })); // Increase JSON body size limit

//200
app.post('/webhook/pdf/extraction/:documentUUID/:selectionUUID', async (req, res) => {
	console.log('/callback/:documentUUID/');
	const documentUUID = req.params.documentUUID;
	const selectionUUID = req.params.selectionUUID;

	console.log("CALLBACK WORKING!");

	const client = await pool.connect();
	updateWords(client, documentUUID, selectionUUID, req.body)
		.then(updateIsComplete(client, documentUUID, selectionUUID, true))
		.then(() => {
			res.statusCode = 202
			res.send("OK!");
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

// 201, 500
app.post('/api/pdf/upload', async (req, res) => {
	console.log("/api/pdf/upload");
	let jsonData = req.body;

	if (!jsonData.pdfBase64) {
		throw new Error("Document was not provided!")
	}

	const uploadUUID = uuidv4();
	const client = await pool.connect();
	await addDocumentToTable(client, uploadUUID, req.body.pdfBase64)
		.then(() => {
			res.statusCode = 201;
			return res.send(`{ "documentUUID: ${uploadUUID} }`);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

// 201, 500
app.get('/api/pdf/:documentUUID', async (req, res) => {
	const documentUUID = req.params.documentUUID;

	const client = await pool.connect();
	await getDocumentFromDatabase(client, documentUUID)
	.then((query) => { res.json(query) })
	.catch((e) => {
		res.statusCode = 404;
		res.json(e);
	})
	.finally(() => {
		client.release();
	})
});

app.get('/api/pdf/status/:documentUUID/:selectionUUID', async (req, res) => {
	console.log("/api/pdf/status/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await pool.connect();
	getisCompletedSelectionFromUUID(client, userId, selectionId)
		.then((response) => {
			if (response.rows.length == 0) {
				res.statusCode = 404;
				res.send();
				return;
			}

			res.json(response.rows[0]);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

app.get('/api/pdf/:documentUUID/:selectionUUID', async (req, res) => {
	console.log("/api/pdf/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await pool.connect();
	getSelectionFromUUID(client, userId, selectionId)
		.then((response) => {
			if (response.rows.length == 0) {
				res.statusCode = 404;
				res.send();
				return;
			}

			res.json(response.rows[0]);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

//202, 500
const callbackURL = "/webhook/pdf/extraction/";
app.post('/api/pdf/extract', async (req, res) => {
	console.log("/api/pdf/extract");
	let jsonData = req.body;

	if (!jsonData.documentUUID) {
		throw new Error("documentUUID is not stated");
	}

	let managementURL;
	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url) => {
		managementURL = url;
	});

	req.body.selectionUUID = req.body.selectionUUID || uuidv4();

	req.body.callbackURL = callbackURL + `${jsonData.documentUUID}/${req.body.selectionUUID}`;
	req.body.callbackService = serviceName;

	let client = await pool.connect();
	await axios.post(`${managementURL}/management/pdf/extract`, jsonData, { headers: req.headers }).then(async (proxyResponse) => {

		await addSelectionTotable(client, jsonData.documentUUID, proxyResponse.data.selectionUUID, jsonData.selection);

		res.statusCode = proxyResponse.status
		res.send(proxyResponse.data);
	}).catch((err) => {
		console.log("ERROR!")
		res.statusCode = 500
		res.send(err);
	}).finally(() => {
		client.release();
	})
});

app.listen(process.env.EXPRESS_PORT, async () => {
	let client = await pool.connect();
	await setupPostgreSQL(client, process.env.POSTGRES_DATABASE);
	await configureEukera();
	console.log(`server listening on port ${process.env.EXPRESS_PORT}`)
	await client.release();
});

const gracefulShutdown = () => {
	console.log('Closing PostgreSQL pool...');
	pool.end(() => {
		console.log('PostgreSQL pool closed.');
		process.exit(0);
	});
};

// Listen for app termination signals
app.on('close', gracefulShutdown);

app.use(logErrors);
app.use(errorHandler);

//todo: callback URL, status checks! 