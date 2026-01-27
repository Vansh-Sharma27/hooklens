const { FORWARD_TIMEOUT } = require('../config/constants');

/**
 * Forward a captured request to a target URL
 * @param {Object} request - Captured request object
 * @param {string} targetUrl - Target URL to forward to
 * @returns {Promise<Object>} Forwarding result
 */
async function forwardRequest(request, targetUrl) {
  const startTime = Date.now();
  
  try {
    // Validate target URL
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Invalid target URL');
    }

    // Build full URL with path and query
    const url = new URL(request.path, targetUrl);
    
    // Prepare headers (exclude Host, keep others)
    const headers = {};
    for (const [key, value] of Object.entries(request.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'connection') {
        headers[key] = value;
      }
    }
    
    // Add HookLens identifier
    headers['X-Forwarded-By'] = 'HookLens';
    
    // Prepare request options
    const options = {
      method: request.method,
      headers: headers,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT)
    };
    
    // Add body for non-GET/HEAD methods
    if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
      options.body = request.body;
    }
    
    // Make the request
    const response = await fetch(url.toString(), options);
    
    // Get response body
    const responseBody = await response.text();
    
    // Extract response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      statusCode: response.status,
      statusText: response.statusText,
      responseBody: responseBody,
      responseHeaders: responseHeaders,
      latency: latency,
      targetUrl: url.toString()
    };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      success: false,
      statusCode: 0,
      error: error.message,
      errorType: error.name,
      latency: latency,
      targetUrl: targetUrl
    };
  }
}

module.exports = {
  forwardRequest
};
