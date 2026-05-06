# HookLens - Webhook Debugger

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A developer tool that provides instant, disposable webhook endpoints for capturing, inspecting, and debugging HTTP requests in real-time.

## Features

- **Instant Webhook URLs** - Generate unique public endpoints in one click
- **Real-time Updates** - See incoming requests appear instantly via WebSocket
- **Request Inspection** - View headers, query parameters, and body with JSON
  syntax highlighting
- **Custom Responses** - Configure status codes, response bodies, and delays
- **Persistent Storage** - SQLite by default, 7-day retention across restarts
- **Multiple Endpoints** - Keep up to 20 endpoints in the sidebar per browser
- **Search and Filter** - Filter captured requests by text or HTTP method
- **Request Forwarding** - Relay captured requests to another URL, manually or automatically
- **Signature Verification** - Check Stripe, GitHub, Slack and Twilio webhook signatures
- **Request Diffing** - Compare two captured requests side by side
- **Developer Tools** - Copy requests as cURL, export to a Postman collection
- **Zero Configuration** - No signup required, works out of the box

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Vansh-Sharma27/hooklens.git
cd hooklens

# Install dependencies
npm install

# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`. Open this URL in your browser to access the dashboard.

### Production

```bash
# Start the production server
npm start
```

## Usage

### 1. Create an Endpoint

Visit `http://localhost:3000` in your browser. The app will automatically create a unique webhook endpoint for you.

### 2. Send Webhook Requests

Use the generated URL to send HTTP requests from any tool or service:

```bash
curl -X POST http://localhost:3000/hook/YOUR_ENDPOINT_ID \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": "hello"}'
```

### 3. View in Real-Time

Requests appear instantly in the dashboard with full details:
- HTTP method and path
- All headers
- Query parameters
- Request body, exactly as received
- Timestamp and source IP

### 4. Configure Responses

Customize how your endpoint responds:
- Status code (200, 404, 500, etc.)
- Response body (text or JSON)
- Content-Type header
- Response delay (for timeout testing)

### 5. Developer Utilities

- **Copy as cURL** - Generate cURL commands to replay requests
- **Copy Headers/Body** - Quick copy for testing
- **Clear All** - Reset captured requests
- **Compare** - Diff two captured requests
- **Forward** - Relay a request to another URL
- **Verify Signature** - Check the request against a provider's signing secret
- **Export to Postman** - Download the endpoint's requests as a collection

## Architecture

### Tech Stack

- **Backend**: Node.js, Express.js
- **WebSocket**: ws library for real-time updates
- **Frontend**: Vanilla JavaScript (no build step)
- **Styling**: Custom CSS (`client/css/styles.css`)
- **Storage**: SQLite via better-sqlite3 (default), or in-memory

### Project Structure

```
hooklens/
├── server/                  # Backend
│   ├── config/
│   │   └── constants.js     # Limits and defaults
│   ├── middleware/          # Express middleware
│   │   ├── bodyParser.js    # Raw body capture and size limit
│   │   ├── cors.js          # CORS handling
│   │   ├── errorHandler.js
│   │   └── rateLimit.js     # Rate limiting
│   ├── routes/
│   │   ├── api.js           # REST endpoints
│   │   ├── hook.js          # Webhook capture
│   │   └── pages.js         # HTML serving
│   ├── store/               # Data layer
│   │   ├── index.js         # Backend selection (STORAGE_TYPE)
│   │   ├── memory.js        # In-memory storage
│   │   ├── sqlite.js        # SQLite storage
│   │   └── schema.sql       # Table definitions
│   ├── utils/
│   │   ├── curl.js          # cURL generation
│   │   ├── diff.js          # Request comparison
│   │   ├── forward.js       # Request forwarding
│   │   ├── parser.js        # Request parsing
│   │   ├── postman.js       # Postman collection export
│   │   └── signatures.js    # Signature verification
│   ├── websocket/
│   │   └── server.js
│   └── index.js             # Entry point
├── client/                  # Frontend
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js           # HTTP client
│   │   ├── app.js           # Main application
│   │   ├── diff.js          # Diff UI
│   │   ├── endpoints.js     # Endpoint sidebar
│   │   ├── export.js        # Postman export UI
│   │   ├── forwarding.js    # Forwarding UI
│   │   ├── mobile.js        # Mobile layout behaviour
│   │   ├── search.js        # Search and filtering
│   │   ├── signatures.js    # Signature verification UI
│   │   ├── ui.js            # UI rendering
│   │   ├── utils.js         # Helper functions
│   │   └── websocket.js     # WebSocket client
│   └── index.html           # Dashboard
├── tests/                   # Regression tests (node:test)
├── bench/                   # Load and latency harness
├── data/                    # SQLite database location
├── package.json
└── README.md
```

## API Reference

### Endpoints

#### Create Endpoint
```http
POST /api/endpoints
```

**Response:**
```json
{
  "id": "V1StGXR8_Z5j",
  "url": "http://localhost:3000/hook/V1StGXR8_Z5j",
  "createdAt": 1706123456789,
  "expiresAt": 1706209856789,
  "config": {
    "statusCode": 200,
    "responseBody": "OK",
    "contentType": "text/plain",
    "delay": 0,
    "forwardUrl": null,
    "autoForward": false
  }
}
```

#### List Endpoints
```http
GET /api/endpoints?ids=id1,id2,id3
```
Returns summaries for the given ids. Unknown or expired ids are omitted.

#### Get Endpoint Details
```http
GET /api/endpoints/:id
```

**Response:**
```json
{
  "id": "V1StGXR8_Z5j",
  "url": "http://localhost:3000/hook/V1StGXR8_Z5j",
  "createdAt": 1706123456789,
  "expiresAt": 1706209856789,
  "config": { ... },
  "requests": [ ... ],
  "requestCount": 5
}
```

#### Update Response Config
```http
PATCH /api/endpoints/:id/config
Content-Type: application/json

{
  "statusCode": 404,
  "responseBody": "{\"error\": \"Not Found\"}",
  "contentType": "application/json",
  "delay": 1000
}
```

#### Clear Requests
```http
DELETE /api/endpoints/:id/requests
```

#### Get cURL Command
```http
GET /api/endpoints/:id/requests/:requestId/curl
```

#### Delete Endpoint
```http
DELETE /api/endpoints/:id
```

#### Configure Forwarding
```http
PATCH /api/endpoints/:id/forwarding
Content-Type: application/json

{
  "forwardUrl": "http://localhost:4000/webhooks/stripe",
  "autoForward": true
}
```
Send `"forwardUrl": null` to clear it. The target's own path is preserved; any
path segments and query string beyond `/hook/:id` are appended to it.

#### Forward a Request
```http
POST /api/endpoints/:id/requests/:requestId/forward
Content-Type: application/json

{ "targetUrl": "http://localhost:4000/webhooks/stripe" }
```
`targetUrl` is optional and falls back to the endpoint's configured `forwardUrl`.
Returns status, latency, response headers and body from the target.

#### Verify Webhook Signature
```http
POST /api/endpoints/:id/requests/:requestId/verify
Content-Type: application/json

{ "provider": "stripe", "secret": "whsec_..." }
```
Supported providers: `stripe`, `github`, `slack`, `twilio`. Returns `valid`
plus the expected and received signatures. Verification runs against the bytes
exactly as received, which is what the sending service signed.

#### Compare Two Requests
```http
POST /api/endpoints/:id/diff
Content-Type: application/json

{ "requestId1": "abc", "requestId2": "def" }
```

#### Export to Postman
```http
GET /api/endpoints/:id/export/postman?name=My%20Collection&baseUrl=https://example.com
```
Returns a Postman Collection v2.1.0 document as a file download.

#### Capture Webhook
```http
ANY /hook/:id
```
Accepts any HTTP method and captures the complete request. Bodies larger than
`MAX_BODY_SIZE` are rejected with `413`.

### WebSocket

Connect to `ws://localhost:3000/ws` and send:

```json
{
  "type": "SUBSCRIBE",
  "endpointId": "V1StGXR8_Z5j"
}
```

Receive new requests:
```json
{
  "type": "NEW_REQUEST",
  "data": {
    "id": "req_abc123",
    "timestamp": 1706123456789,
    "method": "POST",
    "headers": { ... },
    "body": "...",
    "isJson": true,
    "parsedBody": { ... }
  }
}
```

When auto-forwarding is enabled, the result arrives separately:
```json
{
  "type": "FORWARD_RESULT",
  "data": {
    "requestId": "req_abc123",
    "result": { "success": true, "statusCode": 200, "latency": 42 }
  }
}
```

Other client messages: `{"type":"UNSUBSCRIBE"}` and `{"type":"PING"}`, which is
answered with `{"type":"PONG"}`.

## Configuration

### Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
PORT=3000
NODE_ENV=production
BASE_URL=https://your-domain.com
RATE_LIMIT_ENABLED=true

# Storage
STORAGE_TYPE=sqlite          # sqlite (default) or memory
DB_PATH=./data/hooklens.db   # SQLite database path
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `NODE_ENV` | `development` | Stack traces are omitted in `production` |
| `BASE_URL` | request host | Overrides the URL shown for endpoints |
| `RATE_LIMIT_ENABLED` | `true` | Set to `false` to disable rate limiting |
| `HOOK_RATE_LIMIT_MAX` | `1000` | Captures per minute, per endpoint |
| `FORWARD_ALLOW_PRIVATE` | on outside production | Permit forwarding to private and loopback addresses |
| `STORAGE_TYPE` | `sqlite` | `sqlite` persists, `memory` does not |
| `DB_PATH` | `./data/hooklens.db` | SQLite file location |

### Limits

Default configuration (see `server/config/constants.js`):

- **Max Endpoints**: 10,000 concurrent
- **Max Requests per Endpoint**: 100 (oldest evicted first)
- **Endpoint TTL**: 7 days
- **Max Body Size**: 1MB, enforced — larger bodies are rejected with `413`
- **Max Response Delay**: 30 seconds
- **API Rate Limit**: 100 requests/minute per IP, for `/api` only
- **Capture Rate Limit**: 1000 requests/minute *per endpoint*, for `/hook/:id`.
  Keyed by endpoint rather than by sender IP, so one busy endpoint cannot
  consume another's budget or lock you out of the dashboard. Raise it with
  `HOOK_RATE_LIMIT_MAX` when replaying large batches.

Static assets and the dashboard page are not rate limited.

## Deployment

> **Persistence:** the default `sqlite` backend writes to `DB_PATH`
> (`./data/hooklens.db`). Most managed platforms use ephemeral filesystems, so
> without a mounted volume the database is discarded on every deploy and
> restart. Attach a persistent volume and point `DB_PATH` at it, or set
> `STORAGE_TYPE=memory` and accept that captures are lost on restart.

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Docker

Save this as `Dockerfile` in the project root. `better-sqlite3` is a native
module, so the build toolchain is needed on Alpine:

```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/hooklens.db
VOLUME /data
EXPOSE 3000
CMD ["node", "server/index.js"]
```

```bash
docker build -t hooklens .
docker run -p 3000:3000 -v hooklens-data:/data hooklens
```

## Development

### Scripts

```bash
# Development with auto-restart
npm run dev

# Production server
npm start
```

### Project Guidelines

- **No build step** - Frontend uses vanilla JavaScript
- **ES Modules** - Client-side JavaScript uses ES6 modules
- **Persistent by default** - SQLite storage survives restarts; set
  `STORAGE_TYPE=memory` for throwaway runs
- **Security headers** - CSP, X-Frame-Options, etc. included

## Testing

```bash
npm test
```

Runs the regression suite in `tests/` with the built-in `node:test` runner. It
covers raw body capture, signature verification for all four providers, body
size limits, and forward URL construction. Tests use the in-memory store and
bind an ephemeral port, so they do not touch `data/`.

### Benchmarks

```bash
node bench/store.js      # persistence cost, no HTTP
node bench/capture.js    # capture latency under offered load
node bench/fanout.js     # webhook accepted -> dashboard notified
```

See `bench/README.md` for methodology and a recorded baseline. Note that SQLite
storage is synchronous and saturates near 300 requests/second on the reference
machine; the in-memory backend is far faster but does not persist.

### Manual Testing

```bash
# Start the server
npm run dev

# In another terminal, send test requests
curl -X POST http://localhost:3000/hook/YOUR_ENDPOINT_ID \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify in browser at http://localhost:3000
```

### Test with Real Services

Configure webhook URLs in:
- **Stripe**: Use test mode webhooks
- **GitHub**: Repository webhooks
- **Twilio**: SMS/Call webhooks
- **Discord**: Bot webhooks

## Security Considerations

- **Rate Limiting**: Enabled by default, separately for the API and for capture
- **Endpoint IDs**: 12-char nanoid strings. The id is the only access control —
  anyone who has it can read every request captured by that endpoint, over both
  the REST API and the WebSocket. Treat endpoint URLs as secrets.
- **Body Size Limits**: 1MB maximum, enforced
- **Signature Comparison**: Constant-time, so a signature cannot be recovered by
  timing repeated guesses
- **No PII Logging**: Request bodies are not logged server-side
- **CORS**: Permissive, so webhook senders are never blocked
- **CSP Headers**: `script-src 'self'` with no inline scripts and no
  third-party origins

### Forwarding

Request forwarding makes an outbound HTTP request to the configured URL and
replays the captured headers to it, `Authorization` and `Cookie` included. Two
restrictions apply:

- Only `http` and `https` targets are accepted, always.
- Loopback, private, carrier-grade NAT, link-local and reserved addresses are
  refused when `FORWARD_ALLOW_PRIVATE` is off, which is the default under
  `NODE_ENV=production`. Hostnames are resolved and every resulting address is
  checked. Development keeps private targets enabled, since forwarding to
  localhost is the normal workflow.

On a publicly reachable instance, leave the default in place. Turning
`FORWARD_ALLOW_PRIVATE=true` back on there lets anyone who can create an
endpoint reach services only the server can see, and read the responses in the
dashboard.

This narrows but does not eliminate DNS rebinding: the hostname is resolved
again when the request is made, so a record with a very short TTL could answer
differently the second time.

## Known Limitations

- **No Authentication**: Endpoints are public by design; the id is the capability
- **Text Bodies**: Captured bodies are stored as UTF-8 text, so binary payloads
  are not preserved byte-for-byte
- **Single-Node**: SQLite storage assumes one process; there is no clustering
- **Throughput**: The synchronous SQLite driver caps capture at roughly 300
  requests/second; see `bench/README.md`

## Roadmap

### v1.1 - Persistence (shipped)
- SQLite storage with 7-day retention
- Multiple endpoints per session
- Request search and filtering

### v1.2 - Power Features (shipped)
- Request forwarding
- Webhook signature verification helpers
- Request diffing (compare two requests)
- Export to Postman collection

### v2.0 - Collaboration
- User accounts
- Team workspaces
- Shareable endpoint links
- API access with tokens

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by Webhook.site and RequestBin
- Built with modern web technologies
- Designed for developer productivity

## Support

- **Issues**: [GitHub Issues](https://github.com/Vansh-Sharma27/hooklens/issues)
- **Documentation**: This README and inline code comments
- **Community**: Discussions tab on GitHub

---

**Made with ♥ for developers**
