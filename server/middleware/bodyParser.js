const { MAX_BODY_SIZE } = require('../config/constants');

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'DELETE']);
const EMPTY = Buffer.alloc(0);

// An over-limit body is read to the end and discarded rather than answered
// mid-upload, because most clients surface a mid-upload response as a connection
// reset and never report the 413. Nothing is buffered while draining, so memory
// stays bounded; only bandwidth is spent. These two limits bound that courtesy:
// how many bytes will be discarded, and how long to wait for a sender that
// declared more than it sends.
const DRAIN_LIMIT_FACTOR = 8;
const DRAIN_TIMEOUT_MS = 5000;

/**
 * Captures the exact bytes received on req.rawBody before anything parses them.
 *
 * HMAC signature verification signs the payload as transmitted, so a body
 * reconstructed from a parsed object can never reproduce the sender's digest.
 * req.rawBody is the source of truth; req.body stays a convenience view for the
 * JSON API routes.
 */
function bodyParser(req, res, next) {
  if (METHODS_WITHOUT_BODY.has(req.method)) {
    req.rawBody = EMPTY;
    return next();
  }

  const declaredLength = Number(req.get('content-length'));
  const chunks = [];
  let received = 0;
  let settled = false;
  // A declared length over the limit is trusted immediately, so an oversized
  // upload is never buffered even in part.
  let overLimit = Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE;
  let drainTimer = null;

  function finish(handler) {
    if (settled) return;
    settled = true;
    clearTimeout(drainTimer);
    handler();
  }

  function startDrainTimeout() {
    if (drainTimer) return;
    // Backstop for a sender that declares a large body and then stalls, so the
    // request cannot hang waiting for bytes that never arrive.
    drainTimer = setTimeout(() => {
      finish(() => {
        rejectTooLarge(res);
        req.destroy();
      });
    }, DRAIN_TIMEOUT_MS);
    drainTimer.unref();
  }

  if (overLimit) startDrainTimeout();

  req.on('data', chunk => {
    received += chunk.length;

    if (!overLimit && received > MAX_BODY_SIZE) {
      overLimit = true;
      chunks.length = 0; // release what was buffered before the limit was hit
      startDrainTimeout();
    }

    if (overLimit) {
      // Past this multiple the sender is not acting in good faith and forfeits
      // a clean status code.
      if (received > MAX_BODY_SIZE * DRAIN_LIMIT_FACTOR) {
        finish(() => req.destroy());
      }
      return;
    }

    chunks.push(chunk);
  });

  req.on('end', () => {
    finish(() => {
      if (overLimit) return rejectTooLarge(res);

      req.rawBody = Buffer.concat(chunks, received);
      req.body = interpretBody(req.rawBody, req.get('content-type') || '');
      next();
    });
  });

  req.on('error', err => {
    finish(() => {
      // Nothing to report if we tore the connection down ourselves.
      if (overLimit) return;
      next(err);
    });
  });
}

// Mirrors the previous parsing behaviour so existing route handlers keep
// working. Only the raw buffer is new.
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

function rejectTooLarge(res) {
  if (res.headersSent) return;

  res.set('Connection', 'close');
  res.status(413).json({ error: 'Payload too large' });
}

module.exports = { bodyParser, MAX_BODY_SIZE };
