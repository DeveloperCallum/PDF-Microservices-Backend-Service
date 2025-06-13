import { Request, Response } from "express";
import { getServiceUrl } from "../eukrea";
import { getServiceName } from "../util";
import axios from "axios";
import logger, { getBaseLoggerparams } from "../logger";

interface ImageRequest {
    documentUUID: string,
}

const callbackURL = '/webhook/pdf/image';
export async function getImage(req: Request, res: Response) {
    const params: any = getBaseLoggerparams(req, res);

    console.log(req.body)
    const imageReq = req.body as ImageRequest;

    let managementURL;
    await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
        managementURL = url;
    }).catch((e: Error) => {
        logger.error(Object.assign(params, { message: e.message, error: e }))

        if (!res.headersSent) {
            return res.status(500).send(e.message);
        }
    });

    req.body.callbackURL = callbackURL + `${imageReq.documentUUID}` //Set the callbackURL.
    req.body.callbackService = getServiceName(); //Set the name of this service.

    let data = JSON.stringify({
        "documentUUID": `${imageReq.documentUUID}`,
        "callbackURL": `${callbackURL}/${imageReq.documentUUID}`,
        "callbackService": "EXPRESSJS"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${managementURL}/management/pdf/image`,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };

    logger.debug(Object.assign(params, { message: `Sending HTTP request management service`, headers: req.headers, conf: config, dat: data }));
    axios.request(config)
        .then((response: any) => {
            console.log(JSON.stringify(response.data));
        })
        .catch((e: Error) => {
            logger.error(Object.assign(params, { message: e.message, error: e }))

		if (!res.headersSent) {
			res.statusCode = 500;
            return res.status(500).send(e.message);
		}
        });

    res.send();
}