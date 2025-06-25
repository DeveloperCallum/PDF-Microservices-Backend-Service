import { Request, Response } from "express";
import { getServiceUrl } from "../eukrea";
import { getServiceName } from "../util";
import axios from "axios";
import logger, { getBaseLoggerparams } from "../logger";
import { getImageJsonFromDocumentMetaFromDatabase, setImageJsonFromDocumentMetaFromDatabase } from "../database";
import { getPool } from "../dbPool";

interface ImageRequest {
    documentUUID: string,
}

export interface WorkerApiResponse {
    numberOfImages: number;
    imageChunks: string[];
}

export async function getImage(req: Request, res: Response) {
    const params: any = getBaseLoggerparams(req, res);
    const imageReq = req.body as ImageRequest;
    const client = await getPool().connect();

    const imagesJson = await getImageJsonFromDocumentMetaFromDatabase(client, imageReq.documentUUID);
    console.log(imagesJson)

    if (imagesJson) {
        logger.info(Object.assign(params, { message: "returned found images", documentUUID: imageReq.documentUUID }));
        res.status(200).send(imagesJson);
        return;
    }

    let managementURL;
    await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
        managementURL = url;
    }).catch((e: Error) => {
        logger.error(Object.assign(params, { message: e.message, error: e }))

        if (!res.headersSent) {
            return res.status(500).send(e.message);
        }
    });

    let data = JSON.stringify({
        "documentUUID": `${imageReq.documentUUID}`,
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
    let obj = await axios.request(config);

    let response = obj.data as WorkerApiResponse;
    setImageJsonFromDocumentMetaFromDatabase(client, response.imageChunks, imageReq.documentUUID)
    res.send(response);
}