module.exports.errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500);
  res.json({ error: err.message });
}

module.exports.logErrors = (err, req, res, next) => {
  console.log(err.stack);
  next(err);
}
