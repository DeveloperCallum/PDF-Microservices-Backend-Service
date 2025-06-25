import { NextFunction, Request, Response } from "express";
import logger, { getBaseLoggerparams, traceHeader } from "../logger";
import { v4 } from "uuid";

export function setTraceID(req: Request, res: Response, next: NextFunction) {
    const uuid = req.get(traceHeader) || v4(); //Grab the incoming traceHeader or create one.
    res.setHeader(traceHeader, uuid); //res header is always set!

    const params = getBaseLoggerparams(req, res);
    logger.info(Object.assign(params, { message: `Incoming request to ${req.url} from ${req.hostname}` }))

    next();
}