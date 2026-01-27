module.exports = {
  // Endpoint limits
  MAX_ENDPOINTS: 10000,
  MAX_REQUESTS_PER_ENDPOINT: 100,
  ENDPOINT_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days (v1.1: upgraded from 24 hours)

  // Request limits
  MAX_BODY_SIZE: 1 * 1024 * 1024, // 1MB

  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 100, // requests per window

  // Response defaults
  DEFAULT_STATUS_CODE: 200,
  DEFAULT_RESPONSE_BODY: 'OK',
  DEFAULT_CONTENT_TYPE: 'text/plain',
  MAX_RESPONSE_DELAY: 30000, // 30 seconds

  // Database configuration (v1.1)
  DB_PATH: process.env.DB_PATH || './data/hooklens.db',
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour (v1.1: upgraded from 5 minutes)

  // Forwarding (v1.2)
  FORWARD_TIMEOUT: 30000, // 30 seconds
  MAX_FORWARD_URL_LENGTH: 2048,

  // Signature verification (v1.2)
  SIGNATURE_PROVIDERS: ['stripe', 'github', 'slack', 'twilio'],
  SIGNATURE_TIMESTAMP_TOLERANCE: 300 // 5 minutes (for replay protection)
};
