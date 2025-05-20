//index.js
const { Pool, Client } = require('pg');
const express = require('express');
const { setupPostgreSQL, addDocumentToTable, addSelectionToTtable } = require('./database');
const { configureEukera, getServiceUrl } = require('./eukeka')
const http = require("http");
const axios = require('axios');
const uuidv4 = require('uuid').v4

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

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

app.get('/hi', (req, res) => {
	console.log("/hi")
	res.send("hello")
})

app.get('/api/pdf/status/:documentUUID/', (req, res) => {
	console.log('/api/pdf/status/:documentUUID/');
	const userId = req.params.id; // Extracts '123' from the URL
	res.send(`User ID: ${userId}, Status Unknown!`);
});

app.get('/api/pdf/status/:documentUUID/:selectionUUID', (req, res) => {
	console.log("/api/pdf/status/:documentUUID/:selectionUUID");
	const userId = req.params.id; // Extracts '123' from the URL
	res.send(`User ID: ${userId}, Status Unknown!`);
});


// 201, 500
app.put('/api/pdf/upload', async (req, res) => {
	console.log("/api/pdf/upload");
	const client = await pool.connect();
	const uploadUUID = uuidv4();
	console.log(JSON.stringify(req.body))

	addDocumentToTable(client, uploadUUID, req.body.pdfBase64).then(() => {
		res.status = axios.HttpStatusCode.Created;
		res.send(`{ "documentUUID: ${uploadUUID} }`);
	}).catch(() => {
		res.status = axios.HttpStatusCode.InternalServerError;
		res.send();
	})

	client.release();
});

//202, 500
app.post('/api/pdf/extract', async (req, res) => {
	console.log("/api/pdf/extract");
	let managementURL;

	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url) => {
		managementURL = url;
	});

	console.log(managementURL)

	console.log("PARSING DATA");

	let jsonData = req.body;
	console.log(jsonData);

	console.log("FINISHED PARSING");

	// let client = await pool.connect();
	// await addSelectionToTtable(client, jsonData.documentUUID);
	// client.release();

	await axios.post(`${managementURL}/management/pdf/extract`, req.body, { headers: req.headers }).then((proxyResponse) => {
		res.statusCode = proxyResponse.status
		res.send(proxyResponse.data);
	}).catch((err) => {
		console.log("ERROR!")
		res.statusCode = err.status
		res.send(err);
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
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
app.on('close', gracefulShutdown);

//todo: callback URL, status checks! 