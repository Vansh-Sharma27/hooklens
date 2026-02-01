const crypto = require('crypto');

// Provider configurations
const PROVIDERS = {
  stripe: {
    headerName: 'stripe-signature',
    algorithm: 'sha256',
    timestampTolerance: 300 // 5 minutes
  },
  github: {
    headerName: 'x-hub-signature-256',
    algorithm: 'sha256'
  },
  slack: {
    headerName: 'x-slack-signature',
    timestampHeader: 'x-slack-request-timestamp',
    algorithm: 'sha256',
    timestampTolerance: 300 // 5 minutes
  },
  twilio: {
    headerName: 'x-twilio-signature',
    algorithm: 'sha1'
  }
};

/**
 * Verify webhook signature for various providers
 * @param {string} provider - Provider name (stripe, github, slack, twilio)
 * @param {Object} request - Captured request object
 * @param {string} secret - Webhook signing secret
 * @param {Object} options - Additional options
 * @returns {Object} Verification result
 */
function verifySignature(provider, request, secret, options = {}) {
  if (!PROVIDERS[provider]) {
    return {
      valid: false,
      error: `Unknown provider: ${provider}`,
      provider
    };
  }

  const config = PROVIDERS[provider];
  const receivedSignature = request.headers[config.headerName];

  if (!receivedSignature) {
    return {
      valid: false,
      error: `Missing ${config.headerName} header`,
      provider,
      expected: null,
      received: null
    };
  }

  try {
    switch (provider) {
      case 'stripe':
        return verifyStripe(request, secret, receivedSignature, config);
      case 'github':
        return verifyGitHub(request, secret, receivedSignature, config);
      case 'slack':
        return verifySlack(request, secret, receivedSignature, config);
      case 'twilio':
        return verifyTwilio(request, secret, receivedSignature, config, options);
      default:
        return { valid: false, error: 'Provider not implemented', provider };
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      provider,
      expected: null,
      received: receivedSignature
    };
  }
}

function verifyStripe(request, secret, receivedSignature, config) {
  // Stripe signature format: t=timestamp,v1=signature
  const parts = receivedSignature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return {
      valid: false,
      error: 'Invalid signature format',
      provider: 'stripe',
      received: receivedSignature
    };
  }

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > config.timestampTolerance) {
    return {
      valid: false,
      error: 'Timestamp outside tolerance window',
      provider: 'stripe',
      received: receivedSignature
    };
  }

  // Compute expected signature
  const payload = `${timestamp}.${request.body || ''}`;
  const expectedSignature = hmac(config.algorithm, secret, payload);

  const valid = signature === expectedSignature;

  return {
    valid,
    expected: expectedSignature,
    received: signature,
    provider: 'stripe',
    details: {
      timestamp: parseInt(timestamp),
      age: now - parseInt(timestamp)
    }
  };
}

function verifyGitHub(request, secret, receivedSignature, config) {
  // GitHub signature format: sha256=signature
  const signature = receivedSignature.replace('sha256=', '');

  // Compute expected signature
  const expectedSignature = hmac(config.algorithm, secret, request.body || '');

  const valid = signature === expectedSignature;

  return {
    valid,
    expected: `sha256=${expectedSignature}`,
    received: receivedSignature,
    provider: 'github'
  };
}

function verifySlack(request, secret, receivedSignature, config) {
  // Slack signature format: v0=signature
  const signature = receivedSignature.replace('v0=', '');
  const timestamp = request.headers[config.timestampHeader];

  if (!timestamp) {
    return {
      valid: false,
      error: 'Missing x-slack-request-timestamp header',
      provider: 'slack',
      received: receivedSignature
    };
  }

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > config.timestampTolerance) {
    return {
      valid: false,
      error: 'Timestamp outside tolerance window',
      provider: 'slack',
      received: receivedSignature
    };
  }

  // Compute expected signature
  const signatureBase = `v0:${timestamp}:${request.body || ''}`;
  const expectedSignature = hmac(config.algorithm, secret, signatureBase);

  const valid = signature === expectedSignature;

  return {
    valid,
    expected: `v0=${expectedSignature}`,
    received: receivedSignature,
    provider: 'slack',
    details: {
      timestamp: parseInt(timestamp),
      age: now - parseInt(timestamp)
    }
  };
}

function verifyTwilio(request, secret, receivedSignature, config, options) {
  // Twilio signature uses full URL + sorted POST params
  const url = options.fullUrl;
  
  if (!url) {
    return {
      valid: false,
      error: 'Full URL required for Twilio verification',
      provider: 'twilio',
      received: receivedSignature
    };
  }

  // Build signature string: URL + sorted params
  let signatureString = url;
  
  if (request.body && request.contentType === 'application/x-www-form-urlencoded') {
    // Parse form data and sort keys
    const params = new URLSearchParams(request.body);
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [key, value] of sortedParams) {
      signatureString += key + value;
    }
  }

  // Compute HMAC-SHA1 and base64 encode
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(signatureString)
    .digest('base64');

  const valid = receivedSignature === expectedSignature;

  return {
    valid,
    expected: expectedSignature,
    received: receivedSignature,
    provider: 'twilio'
  };
}

/**
 * Generate HMAC signature
 * @param {string} algorithm - Algorithm (sha256, sha1)
 * @param {string} secret - Secret key
 * @param {string} data - Data to sign
 * @returns {string} Hex-encoded signature
 */
function hmac(algorithm, secret, data) {
  return crypto
    .createHmac(algorithm, secret)
    .update(data, 'utf8')
    .digest('hex');
}

/**
 * List supported providers
 * @returns {Array} Array of provider names
 */
function getSupportedProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = {
  verifySignature,
  getSupportedProviders,
  PROVIDERS
};
