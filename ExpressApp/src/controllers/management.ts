import { addSelectionTotable }from "../database";
import { getPool } from "../dbPool";
import { getServiceUrl } from "../eukeka";
import { getServiceName } from "../util";
import axios from "axios";
import { v4 } from "uuid"; 

const callbackURL = "/webhook/pdf/extraction/";
export async function extract(req: any, res: any) {
	console.log("/api/pdf/extract");
	let jsonData = req.body;

	if (!jsonData.documentUUID) {
		throw new Error("documentUUID is not stated");
	}

	let managementURL;
	await getServiceUrl("WORKERMANAGEMENTSERVICE").then((url: any) => {
		managementURL = url;
	});

	req.body.selectionUUID = req.body.selectionUUID || v4();

	req.body.callbackURL = callbackURL + `${jsonData.documentUUID}/${req.body.selectionUUID}`;
	req.body.callbackService = getServiceName();

	let client = await getPool().connect();
	await axios.post(`${managementURL}/management/pdf/extract`, jsonData, { headers: req.headers }).then(async (proxyResponse : any) => {

		await addSelectionTotable(client, jsonData.documentUUID, proxyResponse.data.selectionUUID, jsonData.selection);

		res.statusCode = proxyResponse.status
		res.send(proxyResponse.data);
	}).catch((err: any) => {
		console.log("ERROR!")
		res.statusCode = 500
		res.send(err);
	}).finally(() => {
		client.release();
	})
}