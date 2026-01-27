const { nanoid } = require('nanoid');
const {
  MAX_ENDPOINTS,
  MAX_REQUESTS_PER_ENDPOINT,
  ENDPOINT_TTL,
  DEFAULT_STATUS_CODE,
  DEFAULT_RESPONSE_BODY,
  DEFAULT_CONTENT_TYPE
} = require('../config/constants');

class MemoryStore {
  constructor() {
    this.endpoints = new Map();

    // Cleanup expired endpoints every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  createEndpoint() {
    // Enforce endpoint limit
    if (this.endpoints.size >= MAX_ENDPOINTS) {
      const oldestId = this.endpoints.keys().next().value;
      if (oldestId) {
        this.endpoints.delete(oldestId);
      }
    }

    const id = nanoid(12);
    const now = Date.now();
    const endpoint = {
      id,
      createdAt: now,
      expiresAt: now + ENDPOINT_TTL,
      config: {
        statusCode: DEFAULT_STATUS_CODE,
        responseBody: DEFAULT_RESPONSE_BODY,
        contentType: DEFAULT_CONTENT_TYPE,
        delay: 0
      },
      requests: []
    };

    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  getEndpoint(id) {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;

    if (Date.now() > endpoint.expiresAt) {
      this.endpoints.delete(id);
      return null;
    }

    return endpoint;
  }

  addRequest(endpointId, request) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    endpoint.requests.unshift(request);

    if (endpoint.requests.length > MAX_REQUESTS_PER_ENDPOINT) {
      endpoint.requests.pop();
    }

    return request;
  }

  updateConfig(endpointId, config) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    endpoint.config = { ...endpoint.config, ...config };
    return endpoint.config;
  }

  clearRequests(endpointId) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    const count = endpoint.requests.length;
    endpoint.requests = [];
    return count;
  }

  deleteEndpoint(id) {
    return this.endpoints.delete(id);
  }

  cleanup() {
    const now = Date.now();
    for (const [id, endpoint] of this.endpoints) {
      if (now > endpoint.expiresAt) {
        this.endpoints.delete(id);
      }
    }
  }

  getStats() {
    return {
      endpointCount: this.endpoints.size,
      totalRequests: [...this.endpoints.values()].reduce(
        (sum, endpoint) => sum + endpoint.requests.length,
        0
      )
    };
  }
}

module.exports = new MemoryStore();
