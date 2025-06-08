module.exports.handleError = (e, res) => {
	res.statusCode = 500;
	res.json(e);
}

module.exports.serviceName = process.env.EUREKA_APP_NAME;