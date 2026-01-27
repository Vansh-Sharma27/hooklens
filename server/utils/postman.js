/**
 * Postman Collection Export
 * Generates Postman Collection v2.1.0 format
 */

/**
 * Generate a Postman collection from captured requests
 * @param {Object} endpoint - Endpoint object
 * @param {Array} requests - Array of captured requests
 * @param {Object} options - Export options (name, baseUrl)
 * @returns {Object} Postman collection object
 */
function generatePostmanCollection(endpoint, requests, options = {}) {
  const collectionName = options.name || `HookLens - ${endpoint.id}`;
  const baseUrl = options.baseUrl || 'http://localhost:3000';
  
  const collection = {
    info: {
      _postman_id: generateUUID(),
      name: collectionName,
      description: `Webhook requests captured by HookLens\nEndpoint: ${endpoint.id}\nExported: ${new Date().toISOString()}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: requests.map(request => requestToPostmanItem(request, baseUrl))
  };
  
  return collection;
}

/**
 * Convert a captured request to a Postman request item
 * @param {Object} request - Captured request
 * @param {string} baseUrl - Base URL for the requests
 * @returns {Object} Postman item
 */
function requestToPostmanItem(request, baseUrl) {
  const timestamp = new Date(request.timestamp).toLocaleString();
  
  // Parse the full URL
  const fullUrl = baseUrl + request.path;
  let parsedUrl;
  try {
    parsedUrl = new URL(fullUrl);
  } catch (error) {
    // Fallback if URL parsing fails
    parsedUrl = {
      protocol: 'http:',
      host: 'localhost',
      pathname: request.path,
      searchParams: new URLSearchParams()
    };
  }
  
  // Prepare headers (exclude certain headers)
  const headers = Object.entries(request.headers || {})
    .filter(([key]) => {
      const lowerKey = key.toLowerCase();
      return !['host', 'content-length', 'connection', 'accept-encoding'].includes(lowerKey);
    })
    .map(([key, value]) => ({
      key,
      value: String(value),
      type: 'text'
    }));
  
  // Prepare query parameters
  const query = [];
  if (parsedUrl.searchParams) {
    parsedUrl.searchParams.forEach((value, key) => {
      query.push({ key, value });
    });
  } else if (request.query) {
    Object.entries(request.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => query.push({ key, value: String(v) }));
      } else {
        query.push({ key, value: String(value) });
      }
    });
  }
  
  // Prepare request body
  let body = undefined;
  if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.isJson && request.parsedBody) {
      body = {
        mode: 'raw',
        raw: JSON.stringify(request.parsedBody, null, 2),
        options: {
          raw: {
            language: 'json'
          }
        }
      };
    } else {
      body = {
        mode: 'raw',
        raw: request.body
      };
    }
  }
  
  // Build Postman item
  const item = {
    name: `${request.method} ${request.path.split('?')[0]} - ${timestamp}`,
    request: {
      method: request.method,
      header: headers,
      url: {
        raw: fullUrl,
        protocol: parsedUrl.protocol.replace(':', ''),
        host: parsedUrl.host ? [parsedUrl.host] : ['localhost'],
        path: parsedUrl.pathname.split('/').filter(Boolean),
        query: query
      }
    },
    response: []
  };
  
  if (body) {
    item.request.body = body;
  }
  
  return item;
}

/**
 * Generate a simple UUID for Postman collection ID
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get suggested filename for the export
 * @param {string} endpointId - Endpoint ID
 * @returns {string} Filename
 */
function getExportFilename(endpointId) {
  const date = new Date().toISOString().split('T')[0];
  return `hooklens-${endpointId}-${date}.postman_collection.json`;
}

module.exports = {
  generatePostmanCollection,
  getExportFilename
};
