const express = require('express');
const store = require('../store');
const { broadcast } = require('../websocket/server');
const { parseRequest } = require('../utils/parser');
const { forwardRequest } = require('../utils/forward');

const router = express.Router();

// Capture ALL HTTP methods
router.all('/:endpointId', async (req, res) => {
  const { endpointId } = req.params;
  const endpoint = store.getEndpoint(endpointId);

  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found or expired' });
  }

  const capturedRequest = parseRequest(req);
  store.addRequest(endpointId, capturedRequest);

  broadcast(endpointId, {
    type: 'NEW_REQUEST',
    data: capturedRequest
  });

  // Auto-forward if configured (non-blocking)
  if (endpoint.config.autoForward && endpoint.config.forwardUrl) {
    forwardRequest(capturedRequest, endpoint.config.forwardUrl)
      .then(result => {
        broadcast(endpointId, {
          type: 'FORWARD_RESULT',
          data: {
            requestId: capturedRequest.id,
            result: result
          }
        });
      })
      .catch(error => {
        console.error('Auto-forward error:', error);
      });
  }

  if (endpoint.config.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, endpoint.config.delay));
  }

  return res
    .status(endpoint.config.statusCode)
    .set('Content-Type', endpoint.config.contentType)
    .send(endpoint.config.responseBody);
});

module.exports = router;
