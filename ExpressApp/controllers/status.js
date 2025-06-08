const { getisCompletedSelectionFromUUID } = require("../database");
const { getPool } = require("../dbPool");
const { handleError } = require("../util");

module.exports.status = async (req, res) => {
	console.log("/api/pdf/status/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await getPool().connect();
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
}