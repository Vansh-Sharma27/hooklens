const WebSocket = require('ws');

let wss = null;
const subscriptions = new Map();

function setupWebSocket(server) {
  wss = new WebSocket.Server({
    server,
    path: '/ws'
  });

  wss.on('connection', ws => {
    ws.isAlive = true;
    ws.subscribedEndpoint = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', data => {
      try {
        const message = JSON.parse(data);
        handleMessage(ws, message);
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format'
          })
        );
      }
    });

    ws.on('close', () => {
      unsubscribe(ws);
    });

    ws.on('error', () => {
      unsubscribe(ws);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        unsubscribe(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

function handleMessage(ws, message) {
  switch (message.type) {
    case 'SUBSCRIBE':
      subscribe(ws, message.endpointId);
      break;
    case 'UNSUBSCRIBE':
      unsubscribe(ws);
      break;
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG' }));
      break;
    default:
      break;
  }
}

function subscribe(ws, endpointId) {
  unsubscribe(ws);

  if (!endpointId) return;

  if (!subscriptions.has(endpointId)) {
    subscriptions.set(endpointId, new Set());
  }

  subscriptions.get(endpointId).add(ws);
  ws.subscribedEndpoint = endpointId;
}

function unsubscribe(ws) {
  if (!ws.subscribedEndpoint) return;

  const subs = subscriptions.get(ws.subscribedEndpoint);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscriptions.delete(ws.subscribedEndpoint);
    }
  }

  ws.subscribedEndpoint = null;
}

function broadcast(endpointId, message) {
  const subs = subscriptions.get(endpointId);
  if (!subs) return;

  const payload = JSON.stringify(message);
  subs.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

module.exports = { setupWebSocket, broadcast };
