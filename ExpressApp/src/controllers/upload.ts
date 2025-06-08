import { addDocumentToTable } from '../database';
import { getPool } from '../dbPool';
import { handleError } from '../util';
import {v4} from 'uuid';

 export async function upload(req: any, res: any) {
	console.log("/api/pdf/upload");
	let jsonData = req.body;

	if (!jsonData.pdfBase64) {
		throw new Error("Document was not provided!")
	}

	const uploadUUID = v4();
	const client = await getPool().connect();
	await addDocumentToTable(client, uploadUUID, req.body.pdfBase64)
		.then(() => {
			res.statusCode = 201;
			return res.send(`{ "documentUUID: ${uploadUUID} }`);
		})
		.catch((e: any) => handleError(e, res))
		.finally(() => {
			client.release();
		})
}