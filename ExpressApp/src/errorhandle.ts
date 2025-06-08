export function errorHandler(err: any, req: any, res: any, next: any) {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500);
  res.json({ error: err.message });
}

export function logErrors(err: any, req: any, res: any, next: any) {
  console.log(err.stack);
  next(err);
}
