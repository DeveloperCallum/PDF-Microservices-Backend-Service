import { Response } from "express";

export function handleError(e : Error, res : Response) : void{
	res.statusCode = 500;
	res.json(e);
}

export function getServiceName() : string | undefined{
	return process.env.EUREKA_APP_NAME;
}