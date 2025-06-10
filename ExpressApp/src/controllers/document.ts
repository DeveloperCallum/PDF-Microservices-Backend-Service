import { Request, Response } from "express";
import { getDocumentFromDatabase, getSelectionFromUUID } from "../database";
import { getPool } from "../dbPool";
import { handleError } from "../util";
import logger, { getBaseLoggerparams } from "../logger";

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

export async function getSelection(req: Request, res: Response) {
	const params: any = getBaseLoggerparams(req, res);
	const documentUUID = req.params.documentUUID;
	const selectionUUID = req.params.selectionUUID;

	const client = await getPool().connect();

	getSelectionFromUUID(client, documentUUID, selectionUUID)
		.then((response: any) => {
			res.json(response);
		})
		.catch((e: Error) => {
			logger.error(Object.assign(params, { message: e.message, error: e }));
			handleError(e, res);
		})
		.finally(() => {
			client.release();
		})
};