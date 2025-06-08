const { addSelectionTotable } = require("../database");
const { getPool } = require("../dbPool");
const { getServiceUrl } = require("../eukeka");
const { serviceName } = require("../util");
const axios = require('axios');
const uuidv4 = require('uuid').v4

const callbackURL = "/webhook/pdf/extraction/";
module.exports.extract = async (req, res) => {
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

	let client = await getPool().connect();
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
}