const { addDocumentToTable } = require('../database');
const { getPool } = require('../dbPool');
const { handleError } = require('../util');
const uuidv4 = require('uuid').v4

module.exports.upload = async (req, res) => {
	console.log("/api/pdf/upload");
	let jsonData = req.body;

	if (!jsonData.pdfBase64) {
		throw new Error("Document was not provided!")
	}

	const uploadUUID = uuidv4();
	const client = await getPool().connect();
	await addDocumentToTable(client, uploadUUID, req.body.pdfBase64)
		.then(() => {
			res.statusCode = 201;
			return res.send(`{ "documentUUID: ${uploadUUID} }`);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
}