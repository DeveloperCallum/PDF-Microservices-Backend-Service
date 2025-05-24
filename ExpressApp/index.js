//index.js
const { Pool, Client } = require('pg');
const express = require('express');
const { setupPostgreSQL, addSelectionTotable, getDatabaseFromUUID, getSelectionFromUUID } = require('./database');
const { configureEukera, getServiceUrl } = require('./eukeka')
const http = require("http");
const axios = require('axios');
const uuidv4 = require('uuid').v4

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const serviceName = process.env.EUREKA_APP_NAME;

const handleError = (e, res) => {
	res.statusCode = 404
	return res.send(JSON.stringify(e));
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

app.get('/hi', (req, res) => {
	console.log("/hi")
	res.send("hello")
})

//200, 404
app.get('/api/pdf/status/:documentUUID/', async (req, res) => {
	console.log('/api/pdf/status/:documentUUID/');
	const userId = req.params.documentUUID;

	const client = await pool.connect();
	getDatabaseFromUUID(client, userId)
		.then(() => {
			res.send("OK!")
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

app.put('/callback/:documentUUID/:selectionUUID', async (req, res) => {
	console.log('/callback/:documentUUID/');
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	console.log("CALLBACK WORKING!");
	res.send("YES");
});

app.get('/api/pdf/status/:documentUUID/:selectionUUID', async (req, res) => {
	console.log("/api/pdf/status/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;
	const client = await pool.connect();
	getSelectionFromUUID(client, userId, selectionId)
		.then((response) => {
			const resp = {
				isCompleted: `${response.rows[0].isCompleted}`
			}
			res.send(JSON.stringify(resp))
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

// 201, 500
app.put('/api/pdf/upload', async (req, res) => {
	console.log("/api/pdf/upload");
	const client = await pool.connect();
	const uploadUUID = uuidv4();
	console.log(JSON.stringify(req.body))

	addSelectionTotable(client, uploadUUID, req.body.pdfBase64)
		.then(() => {
			res.status = axios.HttpStatusCode.Created;
			res.send(`{ "documentUUID: ${uploadUUID} }`);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
});

//202, 500
app.post('/api/pdf/extract', async (req, res) => {
	console.log("/api/pdf/extract");

	let managementURL;
	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url) => {
		managementURL = url;
	});

	let jsonData = req.body;
	req.body.selectionUUID = req.body.selectionUUID ||uuidv4();


	req.body.callbackURL = `${jsonData.documentUUID}/${req.body.selectionUUID}`;
	req.body.callbackService = serviceName;

	console.log(jsonData)

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

//todo: callback URL, status checks! 