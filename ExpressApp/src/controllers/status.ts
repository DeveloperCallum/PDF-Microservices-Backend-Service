import { Request, Response } from "express";

import { getisCompletedSelectionFromUUID } from "../database";
import { getPool } from "../dbPool";
import { handleError } from "../util";

export async function status(req: Request, res: Response) {
	console.log("/api/pdf/status/:documentUUID/:selectionUUID");
	const userId = req.params.documentUUID;
	const selectionId = req.params.selectionUUID;

	const client = await getPool().connect();
	getisCompletedSelectionFromUUID(client, userId, selectionId)
		.then((response: any) => {
			if (response.rows.length == 0) {
				res.statusCode = 404;
				res.send();
				return;
			}

			res.json(response.rows[0]);
		})
		.catch((e: any) => handleError(e, res))
		.finally(() => {
			client.release();
		})
}