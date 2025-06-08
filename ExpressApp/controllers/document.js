const { getDocumentFromDatabase, getSelectionFromUUID } = require("../database");
const { getPool } = require("../dbPool");
const { handleError } = require("../util");

module.exports.getDocument = async (req, res) => {
	const documentUUID = req.params.documentUUID;

	const client = await getPool().connect();
	await getDocumentFromDatabase(client, documentUUID)
	.then((query) => { res.json(query) })
	.catch((e) => {
		res.statusCode = 404;
		res.json(e);
	})
	.finally(() => {
		client.release();
	})
}

module.exports.getSelection = async (req, res) => {
	console.log("/api/pdf/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await getPool().connect();
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
};