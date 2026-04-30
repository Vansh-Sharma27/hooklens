const rateLimit = require('express-rate-limit');
const {
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  HOOK_RATE_LIMIT_MAX
} = require('../config/constants');

const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
const passthrough = (req, res, next) => next();

const HOOK_PATH = /^\/hook\/([^/?]+)/;

// Every other error in this app is JSON; the library default is plain text.
function tooManyRequests(req, res) {
  return res.status(429).json({ error: 'Too many requests' });
}

function build(options) {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
    ...options
  });
}

// Dashboard and REST API, keyed by IP.
const apiRateLimiter = build({ limit: RATE_LIMIT_MAX });

// Webhook capture, keyed by endpoint id rather than sender IP.
//
// A single shared bucket previously covered every route, so a provider bursting
// above the limit lost webhooks to 429 - the exact requests the tool exists to
// record - and could also lock the owner out of their own dashboard. Keying per
// endpoint keeps one busy endpoint from starving the others.
const hookRateLimiter = build({
  limit: HOOK_RATE_LIMIT_MAX,
  keyGenerator: req => {
    const match = HOOK_PATH.exec(req.path);
    return match ? match[1] : 'unknown';
  }
});

/**
 * Dispatch by path so each surface gets its own budget. Runs before the body
 * parser, so a rejected request never has its body buffered. Static assets and
 * the dashboard page are not limited; serving them would otherwise consume the
 * same budget as the API that the page then calls.
 */
function rateLimiter(req, res, next) {
  if (!enabled) return next();

  if (HOOK_PATH.test(req.path)) {
    return hookRateLimiter(req, res, next);
  }

  if (req.path.startsWith('/api/')) {
    return apiRateLimiter(req, res, next);
  }

  return next();
}

module.exports = { rateLimiter, apiRateLimiter, hookRateLimiter };
