const { nanoid } = require('nanoid');

function parseRequest(req) {
  const now = Date.now();

  // Read the captured bytes, never the parsed object. Re-serialising a parsed
  // body changes whitespace, escaping and key order, which breaks any signature
  // computed over the payload as it was actually sent.
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
  const body = raw.length > 0 ? raw.toString('utf8') : null;
  const bodySize = raw.length;

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
