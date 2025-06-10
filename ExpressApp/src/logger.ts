import { createLogger, transports, LoggerOptions, format, transport } from 'winston';
import LokiTransport from 'winston-loki';
import { getServiceName } from './util';
import { NextFunction, Response, Request } from 'express';
import { v4 } from 'uuid';
import { IncomingHttpHeaders } from 'http';

// Define logger configuration options
const options: LoggerOptions = {
    format: format.combine(format.timestamp(), format.json()),
    level: 'info', // Optional: Set your desired logging level
    transports: [
        new LokiTransport({
            host: 'http://loki:3100',
            labels: { 'app': getServiceName(), 'host': process.env.HOSTNAME },
            json: true,
            onConnectionError: (err) => console.error(err),
            format: format.combine(
                format.timestamp(),
                format.json()      // <-- outputs full log line as JSON
            )
        }),
        new transports.Console({
            format: format.printf(({ message, level }) => { return `${level}: ${message}` })
        })
    ],
};

export const traceHeader: string = 'X-Trace-Id';

export interface BaseLoggerParams {
    message?: string,
    traceId?: string,
    method?: string,
    url?: string,
    headers?: IncomingHttpHeaders,
    body?: string
    stacktrace?: string
}

export function getBaseLoggerparams(req: Request, res: Response): BaseLoggerParams {
    const param: BaseLoggerParams = {
        traceId: res.get(traceHeader),
        headers: req.headers,
        url: req.url,
        method: req.method,
    }

    return param;
}

export function middleware(req: Request, res: Response, next: NextFunction) {
    const uuid = req.get(traceHeader) || v4(); //Grab the incoming traceHeader or create one.
    res.setHeader(traceHeader, uuid); //res header is always set!

    const params = getBaseLoggerparams(req, res);
    logger.debug(Object.assign(params, { message: `Incoming request to ${req.url}` }))

    next();
}

// Create the logger
const logger = createLogger(options);
export default logger;
