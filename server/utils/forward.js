const { FORWARD_TIMEOUT } = require('../config/constants');
const { assertTargetAllowed } = require('./forwardPolicy');

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
    const url = buildForwardUrl(request.path, targetUrl);

    // Check the destination before any connection is opened
    await assertTargetAllowed(url);

    // Prepare headers (exclude hop-by-hop and length, which fetch recomputes)
    const headers = {};
    for (const [key, value] of Object.entries(request.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
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

/**
 * Resolve the URL a captured request should be delivered to.
 *
 * The captured path is HookLens's own route (/hook/<id>[/extra][?query]), not
 * anything the sender chose. Resolving it against the target as a relative URL
 * would discard the target's own path and deliver to /hook/<id> instead, so the
 * endpoint prefix is stripped and only the remainder is carried over.
 *
 * @param {string} capturedPath - request.path as recorded (req.originalUrl)
 * @param {string} targetUrl - configured destination, path included
 * @returns {URL} Resolved destination
 */
function buildForwardUrl(capturedPath, targetUrl) {
  const url = new URL(targetUrl);
  const [rawPath, rawQuery = ''] = String(capturedPath || '').split('?');
  const subPath = rawPath.replace(/^\/hook\/[^/]+/, '');

  if (subPath) {
    const base = url.pathname.replace(/\/$/, '');
    url.pathname = `${base}/${subPath.replace(/^\//, '')}`;
  }

  if (rawQuery) {
    const merged = new URLSearchParams(url.search);
    for (const [key, value] of new URLSearchParams(rawQuery)) {
      merged.append(key, value);
    }
    url.search = merged.toString();
  }

  return url;
}

module.exports = {
  forwardRequest,
  buildForwardUrl
};
