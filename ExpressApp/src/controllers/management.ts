import { Request, Response } from "express";
import { addSelectionTotable } from "../database";
import { getPool } from "../dbPool";
import { getServiceUrl } from "../eukrea";
import { getServiceName } from "../util";
import axios from "axios";
import { v4 } from "uuid";
import logger, { getBaseLoggerparams } from "../logger";

const callbackURL = "/webhook/pdf/extraction/";
export async function extract(req: Request, res: Response) {
	const params = getBaseLoggerparams(req, res);
	let jsonData = req.body;

	//Check that the request has provided a UUID.
	if (!jsonData.documentUUID) {
		throw new Error("documentUUID is not stated");
	}

	logger.info(Object.assign(params, {message: "Getting service details for WORKERMANAGEMENTSERVICE"}));

	//Get the management service URL from the eureka server.
	let managementURL;
	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
		managementURL = url;
	}).catch((e: Error) => logger.error(Object.assign(params, { message: e.message, error: e })));

	//If the request hasn't provided a selectionUUID than we need to generate one.
	req.body.selectionUUID = req.body.selectionUUID || v4();

	//Form the callback URL. 
	req.body.callbackURL = callbackURL + `${jsonData.documentUUID}/${req.body.selectionUUID}`;
	req.body.callbackService = getServiceName();

	logger.info(Object.assign(params, { message: `Forwarding request` }))
	
	let client = await getPool().connect();
	try {
		let proxyResponse = await axios.post(`${managementURL}/management/pdf/extract`, jsonData, { headers: req.headers });
		await addSelectionTotable(client, jsonData.documentUUID, proxyResponse.data.selectionUUID, jsonData.selection);
		res.status(proxyResponse.status).send(proxyResponse.data);
	} catch (e: any) {
		logger.error(Object.assign(params, { message: e.message, error: e }))
		res.statusCode = 500
		res.send("Internal Server Error!");
	} finally {
		client.release();
	}
}