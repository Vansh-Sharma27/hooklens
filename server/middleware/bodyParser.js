const { MAX_BODY_SIZE } = require('../config/constants');

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'DELETE']);
const EMPTY = Buffer.alloc(0);

// Captures the exact bytes received on req.rawBody before anything parses them.
// HMAC signature verification signs the payload as transmitted, so a body
// reconstructed from a parsed object can never reproduce the sender's digest.
// req.rawBody is the source of truth; req.body stays a convenience view for the
// JSON API routes.
function bodyParser(req, res, next) {
  if (METHODS_WITHOUT_BODY.has(req.method)) {
    req.rawBody = EMPTY;
    return next();
  }

  // Reject on the declared length first so an oversized upload is refused before
  // it is streamed. Chunked requests omit it, hence the running check below.
  const declaredLength = Number(req.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE) {
    return rejectTooLarge(req, res);
  }

  const chunks = [];
  let received = 0;
  let settled = false;

  req.on('data', chunk => {
    if (settled) return;

    received += chunk.length;
    if (received > MAX_BODY_SIZE) {
      settled = true;
      chunks.length = 0;
      return rejectTooLarge(req, res);
    }

    chunks.push(chunk);
  });

  req.on('end', () => {
    if (settled) return;
    settled = true;

    req.rawBody = Buffer.concat(chunks, received);
    req.body = interpretBody(req.rawBody, req.get('content-type') || '');
    next();
  });

  req.on('error', err => {
    if (settled) return;
    settled = true;
    next(err);
  });
}

// Mirrors the previous parsing behaviour so existing route handlers keep working.
// Only the raw buffer is new.
function interpretBody(raw, contentType) {
  if (raw.length === 0) {
    return '';
  }

  const text = raw.toString('utf8');
  const type = contentType.toLowerCase();

  if (type.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }

  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }

  return text;
}

function rejectTooLarge(req, res) {
  if (!res.headersSent) {
    res.set('Connection', 'close');
    res.status(413).json({ error: 'Payload too large' });
  }

  // Drain the rest of the upload without buffering it. Destroying the socket
  // here would reach the client as a connection reset rather than the 413, and
  // discarding the bytes as they arrive is what actually bounds memory.
  req.resume();
}

module.exports = { bodyParser, MAX_BODY_SIZE };
