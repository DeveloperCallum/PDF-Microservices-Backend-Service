import { Request, Response } from "express";
import { getServiceUrl } from "../eukeka";
import { getServiceName } from "../util";
import axios from "axios";
import logger, { BaseLoggerParams, getBaseLoggerparams, traceHeader } from "../logger";

interface ImageRequest {
    documentUUID: string,
}

const callbackURL = '/webhook/pdf/image';
export async function getImage(req: Request, res: Response) {
    const params: any = getBaseLoggerparams(req, res);
    logger.info(Object.assign(params, { message: "request received from user" }))

    console.log(req.body)
    const imageReq = req.body as ImageRequest;

    let managementURL;
    await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
        managementURL = url;
    }).catch((e: Error) => logger.error(Object.assign(params, { message: e.message, error: e })));

    req.body.callbackURL = callbackURL + `/${imageReq.documentUUID}` //Set the callbackURL.
    req.body.callbackService = getServiceName(); //Set the name of this service.

    logger.debug(Object.assign(params, { message: `Sending HTTP request to: ${managementURL}/management/pdf/image` }))
    await axios.post(`${managementURL}/management/pdf/image`, req.body, { headers: req.headers }).then(() => {
        logger.info(Object.assign(params, { message: 'Request HTTP forwarded to WORKERMANAGEMENTSERVICE'}))
    }).catch((e: Error) => logger.error(Object.assign(params, { message: e.message, error: e })));

    res.send();
}