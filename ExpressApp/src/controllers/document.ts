import { Request, Response } from "express";
import { getDocumentFromDatabase, getSelectionFromUUID } from "../database";
import { getPool } from "../dbPool";
import { handleError } from "../util";

export async function getDocument(req: Request, res: Response) {
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

export async function getSelection(req: Request, res: Response){
	console.log("/api/pdf/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await getPool().connect();

	getSelectionFromUUID(client, userId, selectionId)
		.then((response : any) => {
			res.json(response);
		})
		.catch((e) => handleError(e, res))
		.finally(() => {
			client.release();
		})
};