# Changelog

All notable changes to HookLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-27

### Added
- Initial release of HookLens
- Single-click webhook endpoint generation
- Real-time request capture and display via WebSocket
- Request detail view with headers, query params, and body
- JSON syntax highlighting for request bodies
- Copy endpoint URL functionality
- Copy request as cURL command
- Copy request body and headers
- Configure response status code (100-599)
- Configure response body (text/JSON)
- Configure response Content-Type header
- Configure response delay (0-30 seconds)
- Clear all captured requests
- Request history (last 100 requests, in-memory)
- WebSocket connection status indicator
- Mobile-responsive layout
- Dark theme UI optimized for developers
- Rate limiting (100 requests/minute per IP)
- 24-hour endpoint expiration
- Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- Accept any Content-Type
- Handle up to 1MB request bodies
- Automatic endpoint cleanup every 5 minutes
- Security headers (CSP, X-Frame-Options, etc.)
- CORS support for webhook senders

### Technical Details
- Node.js 18+ backend with Express.js
- ws library for WebSocket real-time updates
- Vanilla JavaScript frontend (no build step)
- Tailwind CSS via CDN
- nanoid for secure ID generation
- In-memory storage with Map
- FIFO request queue (max 100 per endpoint)
- Exponential backoff WebSocket reconnection
- Proper error handling and validation

### Documentation
- Comprehensive README with usage examples
- API reference documentation
- Deployment guides (Railway, Render, Docker)
- Contributing guidelines
- MIT License

## [Unreleased]

### Planned for v1.1
- SQLite/Redis persistent storage
- 7-day request retention
- Multiple endpoints per session
- Request search and filtering
- Improved mobile experience

### Planned for v1.2
- Request forwarding to localhost
- Webhook signature verification helpers
- Request diffing (compare two requests)
- Export to Postman collection

### Planned for v2.0
- User accounts and authentication
- Team workspaces
- Shareable endpoint links with permissions
- API access with tokens
- Usage analytics dashboard
- Custom domains

---

[1.0.0]: https://github.com/Vansh-Sharma27/hooklens/releases/tag/v1.0.0
