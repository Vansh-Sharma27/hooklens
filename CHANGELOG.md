# Changelog

All notable changes to HookLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Signature verification now runs against the bytes exactly as received.
  Request bodies were previously parsed and re-serialised before storage, which
  changed whitespace, escaping and key order, so any HMAC computed over the
  payload failed to match. Affected GitHub, Slack and Twilio verification, and
  Stripe for any payload that was not already compact JSON.
- Twilio signature verification matched `content-type` exactly and so rejected
  the `application/x-www-form-urlencoded; charset=UTF-8` that senders actually
  use.
- Twilio verification built the signed URL from the hook path twice, producing
  `/hook/<id>/hook/<id>`.
- `MAX_BODY_SIZE` is now enforced. It was defined in configuration and
  documented as a limit but never applied, so request bodies of any size were
  buffered into memory. Oversized bodies are rejected with `413`.
- Request forwarding resolved the captured path against the target URL, which
  discarded the target's own path and delivered to `/hook/<id>` instead. The
  target path is now preserved, with any extra path segments and query string
  appended to it.
- Forwarded requests no longer carry the original `content-length` header.
- `bodySize` now reports the true byte count received rather than the length of
  a re-serialised copy.

- Signature comparison ran in variable time, so a signature could in principle
  be recovered a byte at a time by timing repeated guesses. It is now constant
  time.
- Forward targets were unrestricted. Any URL that parsed was accepted and the
  request was issued with the captured `Authorization` and `Cookie` headers
  attached, which on a public instance allowed reaching internal addresses.
  Schemes are now limited to `http` and `https`, and private, loopback and
  reserved addresses are refused unless `FORWARD_ALLOW_PRIVATE` is set (on by
  default outside production, so local forwarding is unaffected).
- Rate limiting used a single bucket for every route, so a bursting webhook
  sender lost captures to `429` and could exhaust the budget the dashboard
  needed. Capture now has its own per-endpoint limit and static assets are not
  counted. Rate limited responses are JSON rather than plain text.
- JSON syntax highlighting never applied any highlighting. The body was escaped
  before being matched, and the pattern was written as though it were inside a
  string literal, so no token could match.
- Switching endpoints from the sidebar left the forwarding, diff and export
  modules pointing at the previous endpoint.
- Auto-forward results could never render against the open request, because the
  code looked up an element id that is not in the markup.
- Untrusted values were interpolated into the dashboard without escaping, most
  importantly the forward target's HTTP status text, which that host controls.
- Oversized request bodies are rejected with `413` rather than a connection
  reset.

### Added
- Regression test suite (`npm test`) using the built-in `node:test` runner,
  including direct coverage of the SQLite backend.
- Load and latency benchmark harness under `bench/`.

### Changed
- `addRequest` no longer loads an endpoint's stored requests just to check the
  endpoint exists, and SQL is compiled once rather than per call. Capture
  saturation moves from roughly 220 to roughly 300 requests/second.
- Removed the Tailwind CDN. It supplied two colour utilities that the stylesheet
  already set, so the dashboard now loads no third-party script and needs no
  network access to render. `script-src` tightened to `'self'`.
- The dashboard loads one module script instead of twelve.
- Background cleanup and WebSocket heartbeat timers no longer keep the process
  alive on their own.
- The server only binds a port when run directly, so it can be imported by tests.

### Removed
- Dead exports and duplicated helpers: `diffSummary`, `getSupportedProviders`,
  the client-side `generateCurl` (unreachable, and it dropped header names),
  `removeEndpointId`, `showSignaturePanel`, `hideSignaturePanel`, and the unused
  signature constants. Four `escapeHtml` copies and two `showNotification`
  copies consolidated into `client/js/utils.js`.
- The theme toggle button, which had no handler.

## [1.2.0] - 2026-02-01

### Added
- Request forwarding to a configurable target URL, manual or automatic
- Webhook signature verification for Stripe, GitHub, Slack and Twilio
- Request diffing to compare two captured requests
- Export an endpoint's requests as a Postman Collection v2.1.0
- `FORWARD_RESULT` WebSocket message for auto-forward outcomes

## [1.1.0] - 2026-02-01

### Added
- SQLite persistent storage via better-sqlite3, selectable with `STORAGE_TYPE`
- Multiple endpoints per browser, tracked in a sidebar
- Request search and HTTP method filtering
- Mobile layout with swipe gestures

### Changed
- Endpoint retention extended from 24 hours to 7 days
- Endpoint cleanup interval changed from 5 minutes to 1 hour on the SQLite store

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

---

Planned work is tracked in the Roadmap section of `README.md`.

[1.2.0]: https://github.com/Vansh-Sharma27/hooklens/releases/tag/v1.2.0
[1.1.0]: https://github.com/Vansh-Sharma27/hooklens/releases/tag/v1.1.0
[1.0.0]: https://github.com/Vansh-Sharma27/hooklens/releases/tag/v1.0.0
