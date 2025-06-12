import { Request, Response } from "express";
import { getDocumentFromDatabase, getSelectionFromUUID } from "../database";
import { getPool } from "../dbPool";
import { getServiceName, handleError } from "../util";
import logger, { getBaseLoggerparams } from "../logger";
import { getServiceUrl } from "../eukrea";
import axios, { AxiosResponse } from "axios";

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
	logger.info(Object.assign(params, { message: "Getting document meta" }))

	//TODO: Check database!

	try {
		logger.info(Object.assign(params, { message: "Getting workermanagement service from eukrea" }))
		let managementURL;
		await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => { managementURL = url });

		logger.info(Object.assign(params, { message: "Setting up callback" }))

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

		logger.info(Object.assign(params, { message: "Prepared request for workermanagement service", requestMeta: config }))
		let response: AxiosResponse<any, any> | void = await axios.request(config).then(() => {
			logger.info(Object.assign(params, { message: "sent request for workermanagement service" }))
		});

		res.statusCode = 202;
		if (response) {
			return res.status(response.status).send(response.data);
		}

		res.status(202).send("");
	} catch (e: any) {
		logger.error(Object.assign(params, { message: e.message, error: e }))

		if (!res.headersSent) {
			res.status(500).send(e.message);
		}
	}
}