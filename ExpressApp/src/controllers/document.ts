import { Request, Response } from "express";
import { getDocumentFromDatabase, getSelectionFromUUID } from "../database";
import { getPool } from "../dbPool";
import { getServiceName, handleError } from "../util";
import logger, { getBaseLoggerparams } from "../logger";
import { getServiceUrl } from "../eukeka";

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

const callbackURL = '/webhook/pdf/documentmeta';
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

export async function getDocumentMeta(req: Request, res: Response) {
	const params: any = getBaseLoggerparams(req, res);
	const documentUUID = req.params.documentUUID;

	let managementURL;
	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
		managementURL = url;
	}).catch((e: Error) => {
		logger.error(Object.assign(params, { message: e.message, error: e }))

		if (!res.headersSent) {
			return res.sendStatus(500).send(e.message);
		}
	});

	req.body.callbackURL = callbackURL + `${documentUUID}` //Set the callbackURL.
	req.body.callbackService = getServiceName(); //Set the name of this service.


    let data = JSON.stringify({
        "documentUUID": `${documentUUID}`,
        "callbackURL": `${callbackURL}/${documentUUID}`,
        "callbackService": "EXPRESSJS"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${managementURL}/management/pdf/meta`,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };

}