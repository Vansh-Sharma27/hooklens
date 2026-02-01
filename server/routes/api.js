const express = require('express');
const store = require('../store');
const { MAX_RESPONSE_DELAY, MAX_FORWARD_URL_LENGTH } = require('../config/constants');
const { generateCurl } = require('../utils/curl');
const { forwardRequest } = require('../utils/forward');
const { verifySignature } = require('../utils/signatures');
const { diffRequests } = require('../utils/diff');
const { generatePostmanCollection, getExportFilename } = require('../utils/postman');

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

// PATCH /api/endpoints/:id/forwarding - Configure forwarding
router.patch('/endpoints/:id/forwarding', (req, res) => {
  const updates = {};

  if (req.body.forwardUrl !== undefined) {
    const forwardUrl = req.body.forwardUrl === null ? null : String(req.body.forwardUrl).trim();
    
    if (forwardUrl !== null) {
      if (!forwardUrl || forwardUrl.length > MAX_FORWARD_URL_LENGTH) {
        return res.status(400).json({ error: 'Invalid forwardUrl' });
      }
      
      try {
        new URL(forwardUrl);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid forwardUrl format' });
      }
    }
    
    updates.forwardUrl = forwardUrl;
  }

  if (req.body.autoForward !== undefined) {
    updates.autoForward = Boolean(req.body.autoForward);
  }

  const config = store.updateConfig(req.params.id, updates);
  if (!config) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  return res.json(config);
});

// POST /api/endpoints/:id/requests/:reqId/forward - Forward single request
router.post('/endpoints/:id/requests/:reqId/forward', async (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const request = endpoint.requests.find(item => item.id === req.params.reqId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  // Use provided targetUrl or endpoint's configured forwardUrl
  const targetUrl = req.body.targetUrl || endpoint.config.forwardUrl;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'No target URL specified' });
  }

  try {
    const result = await forwardRequest(request, targetUrl);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Forward failed', 
      message: error.message 
    });
  }
});

// POST /api/endpoints/:id/requests/:reqId/verify - Verify webhook signature
router.post('/endpoints/:id/requests/:reqId/verify', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const request = endpoint.requests.find(item => item.id === req.params.reqId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const { provider, secret } = req.body;

  if (!provider || !secret) {
    return res.status(400).json({ error: 'Provider and secret are required' });
  }

  // For Twilio, we need the full URL
  const baseUrl = getBaseUrl(req);
  const fullUrl = `${baseUrl}/hook/${req.params.id}${request.path}`;
  
  const result = verifySignature(provider, request, secret, { fullUrl });

  return res.json(result);
});

// POST /api/endpoints/:id/diff - Compare two requests
router.post('/endpoints/:id/diff', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const { requestId1, requestId2 } = req.body;

  if (!requestId1 || !requestId2) {
    return res.status(400).json({ error: 'Two request IDs are required' });
  }

  const request1 = endpoint.requests.find(item => item.id === requestId1);
  const request2 = endpoint.requests.find(item => item.id === requestId2);

  if (!request1) {
    return res.status(404).json({ error: `Request ${requestId1} not found` });
  }

  if (!request2) {
    return res.status(404).json({ error: `Request ${requestId2} not found` });
  }

  const diff = diffRequests(request1, request2);

  // Include request summaries for context
  const response = {
    diff,
    request1: {
      id: request1.id,
      timestamp: request1.timestamp,
      method: request1.method,
      path: request1.path
    },
    request2: {
      id: request2.id,
      timestamp: request2.timestamp,
      method: request2.method,
      path: request2.path
    }
  };

  return res.json(response);
});

// GET /api/endpoints/:id/export/postman - Export to Postman collection
router.get('/endpoints/:id/export/postman', (req, res) => {
  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const name = req.query.name || undefined;
  const baseUrl = req.query.baseUrl || getBaseUrl(req);

  const collection = generatePostmanCollection(endpoint, endpoint.requests, {
    name,
    baseUrl
  });

  const filename = getExportFilename(endpoint.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  return res.json(collection);
});

module.exports = router;
