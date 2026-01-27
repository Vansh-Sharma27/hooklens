function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (status === 413 || err.type === 'entity.too.large') {
    message = 'Payload too large';
  }

  const payload = { error: message };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  return res.status(status).json(payload);
}

module.exports = { errorHandler };
