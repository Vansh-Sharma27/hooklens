# HookLens - Webhook Debugger

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A developer tool that provides instant, disposable webhook endpoints for capturing, inspecting, and debugging HTTP requests in real-time.

## Features

- **Instant Webhook URLs** - Generate unique public endpoints in one click
- **Real-time Updates** - See incoming requests appear instantly via WebSocket
- **Request Inspection** - View headers, query parameters, and body with JSON syntax highlighting
- **Custom Responses** - Configure status codes, response bodies, and delays
- **Developer Tools** - Copy requests as cURL commands, export as JSON
- **Zero Configuration** - No signup required, works out of the box
- **Modern UI** - Clean, dark-themed interface optimized for developers

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
- Request body (with JSON highlighting)
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
- **Export** - Download requests as JSON

## Architecture

### Tech Stack

- **Backend**: Node.js, Express.js
- **WebSocket**: ws library for real-time updates
- **Frontend**: Vanilla JavaScript (no build step)
- **Styling**: Tailwind CSS (CDN)
- **Storage**: In-memory (session-based)

### Project Structure

```
hooklens/
├── server/                 # Backend
│   ├── config/            # App configuration
│   │   └── constants.js   # Limits and defaults
│   ├── middleware/        # Express middleware
│   │   ├── cors.js       # CORS handling
│   │   ├── errorHandler.js
│   │   └── rateLimit.js  # Rate limiting
│   ├── routes/           # API routes
│   │   ├── api.js       # REST endpoints
│   │   ├── hook.js      # Webhook capture
│   │   └── pages.js     # HTML serving
│   ├── store/           # Data layer
│   │   └── memory.js    # In-memory storage
│   ├── utils/           # Utilities
│   │   ├── curl.js      # cURL generation
│   │   └── parser.js    # Request parsing
│   ├── websocket/       # WebSocket server
│   │   └── server.js
│   └── index.js         # Entry point
├── client/              # Frontend
│   ├── css/
│   │   └── styles.css   # Custom styles
│   ├── js/
│   │   ├── api.js       # HTTP client
│   │   ├── app.js       # Main application
│   │   ├── ui.js        # UI rendering
│   │   ├── utils.js     # Helper functions
│   │   └── websocket.js # WebSocket client
│   └── index.html       # Dashboard
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
    "delay": 0
  }
}
```

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

#### Capture Webhook
```http
ANY /hook/:id
```
Accepts any HTTP method and captures the complete request.

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

## Configuration

### Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
PORT=3000
NODE_ENV=production
BASE_URL=https://your-domain.com
RATE_LIMIT_ENABLED=true
```

### Limits

Default configuration (see `server/config/constants.js`):

- **Max Endpoints**: 10,000 concurrent
- **Max Requests per Endpoint**: 100 (FIFO)
- **Endpoint TTL**: 24 hours
- **Max Body Size**: 1MB
- **Rate Limit**: 100 requests/minute per IP

## Deployment

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

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
```

```bash
docker build -t hooklens .
docker run -p 3000:3000 hooklens
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
- **Session-based** - Data stored in-memory (lost on restart)
- **Security headers** - CSP, X-Frame-Options, etc. included

## Testing

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

- **Rate Limiting**: Enabled by default (100 req/min per IP)
- **Endpoint IDs**: 12-char random strings (unguessable)
- **Body Size Limits**: 1MB maximum
- **No PII Logging**: Request bodies not logged server-side
- **CORS**: Permissive for webhook senders
- **CSP Headers**: Content Security Policy enforced

## Known Limitations (v1.0)

- **In-Memory Storage**: Requests lost on server restart
- **No Authentication**: Endpoints are public (by design)
- **Single Endpoint per Session**: Browser-based, one active endpoint
- **No Persistence**: 24-hour endpoint expiration

## Roadmap

### v1.1 - Persistence
- Redis/SQLite storage with 7-day retention
- Multiple endpoints per session
- Request search and filtering

### v1.2 - Power Features
- Request forwarding to localhost
- Webhook signature verification helpers
- Request diffing (compare two requests)

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
