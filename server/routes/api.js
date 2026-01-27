const express = require('express');
const store = require('../store');
const { MAX_RESPONSE_DELAY } = require('../config/constants');
const { generateCurl } = require('../utils/curl');

const router = express.Router();

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

router.get('/endpoints', (req, res) => {
  const ids = req.query.ids;
  if (!ids) {
    return res.json({ endpoints: [] });
  }

  const idList = ids.split(',').filter(id => id.trim());
  const baseUrl = getBaseUrl(req);
  
  const endpoints = idList
    .map(id => {
      const endpoint = store.getEndpoint(id);
      if (!endpoint) return null;
      
      return {
        id: endpoint.id,
        url: `${baseUrl}/hook/${endpoint.id}`,
        createdAt: endpoint.createdAt,
        expiresAt: endpoint.expiresAt,
        requestCount: Array.isArray(endpoint.requests) 
          ? endpoint.requests.length 
          : 0
      };
    })
    .filter(Boolean);

  return res.json({ endpoints });
});

router.post('/endpoints', (req, res) => {
  const endpoint = store.createEndpoint();
  const baseUrl = getBaseUrl(req);

  return res.json({
    id: endpoint.id,
    url: `${baseUrl}/hook/${endpoint.id}`,
    createdAt: endpoint.createdAt,
    expiresAt: endpoint.expiresAt,
    config: endpoint.config
  });
});

router.get('/endpoints/:id', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const baseUrl = getBaseUrl(req);
  return res.json({
    id: endpoint.id,
    url: `${baseUrl}/hook/${endpoint.id}`,
    createdAt: endpoint.createdAt,
    expiresAt: endpoint.expiresAt,
    config: endpoint.config,
    requests: endpoint.requests,
    requestCount: endpoint.requests.length
  });
});

router.delete('/endpoints/:id', (req, res) => {
  const deleted = store.deleteEndpoint(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  return res.json({ deleted: true });
});

router.patch('/endpoints/:id/config', (req, res) => {
  const updates = {};

  if (req.body.statusCode !== undefined) {
    const statusCode = Number(req.body.statusCode);
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
      return res.status(400).json({ error: 'Invalid statusCode' });
    }
    updates.statusCode = statusCode;
  }

  if (req.body.responseBody !== undefined) {
    updates.responseBody = String(req.body.responseBody);
  }

  if (req.body.contentType !== undefined) {
    const contentType = String(req.body.contentType).trim();
    if (!contentType) {
      return res.status(400).json({ error: 'Invalid contentType' });
    }
    updates.contentType = contentType;
  }

  if (req.body.delay !== undefined) {
    const delay = Number(req.body.delay);
    if (!Number.isInteger(delay) || delay < 0 || delay > MAX_RESPONSE_DELAY) {
      return res.status(400).json({ error: 'Invalid delay' });
    }
    updates.delay = delay;
  }

  const config = store.updateConfig(req.params.id, updates);
  if (!config) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  return res.json(config);
});

router.delete('/endpoints/:id/requests', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const cleared = store.clearRequests(req.params.id);
  return res.json({ cleared });
});

router.get('/endpoints/:id/requests/:reqId/curl', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const request = endpoint.requests.find(item => item.id === req.params.reqId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const baseUrl = getBaseUrl(req);
  const curl = generateCurl(request, baseUrl);

  return res.json({ curl });
});

module.exports = router;
