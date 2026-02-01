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
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com; font-src 'self' fonts.gstatic.com; connect-src 'self' ws: wss:; img-src 'self' data:; object-src 'none'; base-uri 'self';",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

// Middleware
app.use(corsMiddleware);
app.use(rateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.text({ limit: '1mb' }));
app.use(express.raw({ limit: '1mb', type: '*/*' }));

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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 HookLens running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

module.exports = { app, server, wss };
