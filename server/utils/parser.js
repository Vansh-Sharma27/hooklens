const { nanoid } = require('nanoid');

function parseRequest(req) {
  const now = Date.now();
  let body = null;
  let bodySize = 0;

  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString('utf8');
    } else if (typeof req.body === 'object') {
      try {
        body = JSON.stringify(req.body);
      } catch (error) {
        body = String(req.body);
      }
    } else {
      body = String(req.body);
    }

    bodySize = Buffer.byteLength(body || '', 'utf8');
  }

  const contentType = req.get('content-type') || null;
  let isJson = false;
  let parsedBody = null;

  if (body && contentType && contentType.includes('application/json')) {
    try {
      parsedBody = JSON.parse(body);
      isJson = true;
    } catch (error) {
      // Ignore invalid JSON
    }
  }

  return {
    id: nanoid(8),
    timestamp: now,
    method: req.method,
    path: req.originalUrl,
    headers: normalizeHeaders(req.headers),
    query: req.query,
    body,
    bodySize,
    contentType,
    isJson,
    parsedBody,
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || null
  };
}

function normalizeHeaders(headers) {
  const exclude = ['host', 'connection', 'accept-encoding'];
  const normalized = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!exclude.includes(key.toLowerCase())) {
      normalized[key.toLowerCase()] = Array.isArray(value)
        ? value.join(', ')
        : value;
    }
  }

  return normalized;
}

module.exports = { parseRequest, normalizeHeaders };
