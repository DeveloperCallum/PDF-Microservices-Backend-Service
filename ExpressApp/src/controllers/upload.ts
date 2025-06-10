import { addDocumentToTable } from '../database';
import { getPool } from '../dbPool';
import logger, { getBaseLoggerparams } from '../logger';
import { handleError } from '../util';
import { v4 } from 'uuid';

//Upload a document to the database.
export async function upload(req: any, res: any) {

	//Set the base logging params
	const params: any = getBaseLoggerparams(req, res);
	let jsonData = req.body;

	//Check if the document was provided.
	if (!jsonData.pdfBase64) {
		throw new Error("Document was not provided!")
	}

	//Create an upload UUID.
	const uploadUUID = v4();

	//Connect to the database and upload the document.
	const client = await getPool().connect();
	await addDocumentToTable(client, uploadUUID, req.body.pdfBase64)
		.then(() => {
			res.statusCode = 201;
			return res.send(`{ "documentUUID: ${uploadUUID} }`);
		})
		.catch((e: any) => {
			logger.error(e.message, Object.assign(params, { error: e }))
			handleError(e, res)
		})
		.finally(() => {
			client.release();
		})
}