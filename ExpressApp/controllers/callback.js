const { updateWords, updateIsComplete } = require("../database");
const { getPool } = require("../dbPool");
const { handleError } = require("../util");

module.exports.extractionCallback = async (req, res) => {
	console.log('/webhook/pdf/extraction/:documentUUID/:selectionUUID');
	const documentUUID = req.params.documentUUID;
	const selectionUUID = req.params.selectionUUID;

	console.log("CALLBACK WORKING!");

	const client = await getPool().connect();
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
};

module.exports.imageCallback = async (req, res) => {
	console.log('/webhook/pdf/image/:documentUUID/');
	const documentUUID = req.params.documentUUID;

	console.log("CALLBACK WORKING!");
	console.log(req.body);
}