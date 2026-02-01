module.exports = {
  // Endpoint limits
  MAX_ENDPOINTS: 10000,
  MAX_REQUESTS_PER_ENDPOINT: 100,
  ENDPOINT_TTL: 24 * 60 * 60 * 1000, // 24 hours

  // Request limits
  MAX_BODY_SIZE: 1 * 1024 * 1024, // 1MB

  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 100, // requests per window

  // Response defaults
  DEFAULT_STATUS_CODE: 200,
  DEFAULT_RESPONSE_BODY: 'OK',
  DEFAULT_CONTENT_TYPE: 'text/plain',
  MAX_RESPONSE_DELAY: 30000 // 30 seconds
};
