import { Request, Response } from "express";
import { updateWords, updateIsComplete } from "../database";
import { getPool } from "../dbPool";
import { handleError } from "../util";

export async function extractionCallback(req : Request, res : Response){
	console.log('/webhook/pdf/extraction/:documentUUID/:selectionUUID');
	const documentUUID = req.params.documentUUID;
	const selectionUUID = req.params.selectionUUID;

	console.log("CALLBACK WORKING!");

	const client = await getPool().connect();
	updateWords(client, documentUUID, selectionUUID, req.body)
		.then(await updateIsComplete(client, documentUUID, selectionUUID, true))
		.then(() => {
			res.statusCode = 202
			res.send("OK!");
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
};

export async function imageCallback(req : Request, res: Response) {
	console.log('/webhook/pdf/image/:documentUUID/');
	const documentUUID = req.params.documentUUID;

	console.log("CALLBACK WORKING!");
	console.log(req.body);
}