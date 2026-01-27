function corsMiddleware(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400'
  });

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

module.exports = { corsMiddleware };
