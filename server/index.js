const express = require('express');
const http = require('http');
const path = require('path');

const { setupWebSocket } = require('./websocket/server');
const apiRoutes = require('./routes/api');
const hookRoutes = require('./routes/hook');
const pageRoutes = require('./routes/pages');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimit');
const { corsMiddleware } = require('./middleware/cors');
const { bodyParser } = require('./middleware/bodyParser');

const app = express();
const server = http.createServer(app);

// Trust proxy for accurate IP detection (if behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    // script-src is 'self' only: the page loads no inline or third-party
    // scripts. style-src still needs 'unsafe-inline' for the style attributes
    // in the markup and the inline styles set by the notification helper.
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

// Middleware
app.use(corsMiddleware);
app.use(rateLimiter);

app.use(bodyParser);

// Static files
app.use('/static', express.static(path.join(__dirname, '../client')));

// Routes
app.use('/api', apiRoutes);
app.use('/hook', hookRoutes);
app.use('/', pageRoutes);

// Error handler
app.use(errorHandler);

// Setup WebSocket
const wss = setupWebSocket(server);

// Only bind a port when run directly, so tests can import the app and listen on
// an ephemeral port of their own.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`HookLens running on port ${PORT}`);
    console.log(`   Dashboard: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(() => process.exit(0));
  });
}

module.exports = { app, server, wss };
