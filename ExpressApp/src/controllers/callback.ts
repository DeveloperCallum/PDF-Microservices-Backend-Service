import { Request, Response } from "express";
import { updateWords, updateIsComplete, DocumentMeta, setDocumentMetaFromDatabase } from "../database";
import { getPool } from "../dbPool";
import logger, { getBaseLoggerparams } from "../logger";

export async function extractionCallback(req: Request, res: Response) {
	const documentUUID = req.params.documentUUID;
	const selectionUUID = req.params.selectionUUID;
	const params: any = getBaseLoggerparams(req, res);
	logger.info(Object.assign(params, { message: "Callback Received", body: req.body }))

	const client = await getPool().connect();
	updateWords(client, documentUUID, selectionUUID, req.body)
		.then(await updateIsComplete(client, documentUUID, selectionUUID, true))
		.then(() => {
			res.statusCode = 202
			res.send("OK!");
		})
		.catch((e: Error) => logger.error(Object.assign(params, { message: e.message, error: e })))
		.finally(() => {
			client.release();
		})
};

interface ImageRestResponse {
	UUID: string,
	images: string[]
}

//Take a document UUID and forward it to the processing server.
export async function imageCallback(req: Request, res: Response) {
	const params: any = getBaseLoggerparams(req, res);
	logger.debug(Object.assign(params, { message: "Callback Received", body: req.body }))

	const documentUUID = req.params.documentUUID;
	const body = req.body as ImageRestResponse; // will not work,
}

export async function metaCallback(req: Request, res: Response) {
	const params: any = getBaseLoggerparams(req, res);
	logger.info(Object.assign(params, { message: "Callback Received", body: req.body }))

	//Update the database.
	const client = await getPool().connect();
	const responseData : DocumentMeta = req.body;

	await setDocumentMetaFromDatabase(client, responseData.documentUUID, responseData.imageMeta).then(() => {
		logger.info(Object.assign(params, { message: "Saved document meta" }))
	})

	res.sendStatus(200);
}