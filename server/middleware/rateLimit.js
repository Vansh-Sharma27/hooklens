const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } = require('../config/constants');

const rateLimiter = (() => {
  const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  if (!enabled) {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
})();

module.exports = { rateLimiter };
