# Deployment Guide

This guide covers deploying HookLens to various platforms.

## Table of Contents

1. [Railway](#railway)
2. [Render](#render)
3. [Fly.io](#flyio)
4. [DigitalOcean App Platform](#digitalocean)
5. [Docker](#docker)
6. [Self-Hosted VPS](#self-hosted-vps)

---

## Railway

Railway offers easy deployment with automatic HTTPS and WebSocket support.

### Steps

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd hooklens
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set BASE_URL=https://your-app.railway.app
   ```

6. **Generate Domain**
   - Go to Railway dashboard
   - Select your project
   - Click "Generate Domain" under Settings

**Cost**: Free tier available, then $5/month

---

## Render

Render provides free hosting for web services.

### Steps

1. **Connect GitHub**
   - Go to https://render.com
   - Sign in with GitHub
   - Click "New +" → "Web Service"
   - Connect your `hooklens` repository

2. **Configure Service**
   - **Name**: `hooklens`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

3. **Add Environment Variables**
   ```
   NODE_ENV=production
   BASE_URL=https://your-app.onrender.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment

### Notes
- Free tier may have cold starts (services sleep after 15 min inactivity)
- HTTPS and custom domains supported

**Cost**: Free tier available (with limitations), paid plans from $7/month

---

## Fly.io

Fly.io offers global edge deployment with excellent WebSocket support.

### Steps

1. **Install flyctl**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   flyctl auth login
   ```

3. **Launch App**
   ```bash
   cd hooklens
   flyctl launch
   ```
   
   Answer prompts:
   - App name: `hooklens` (or choose another)
   - Region: Choose closest to you
   - PostgreSQL: No
   - Redis: No

4. **Configure fly.toml** (auto-generated, verify these settings):
   ```toml
   app = "hooklens"
   
   [build]
   
   [env]
     NODE_ENV = "production"
     PORT = "8080"
   
   [[services]]
     http_checks = []
     internal_port = 8080
     processes = ["app"]
     protocol = "tcp"
     
     [[services.ports]]
       force_https = true
       handlers = ["http"]
       port = 80
     
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

5. **Deploy**
   ```bash
   flyctl deploy
   ```

6. **Set Secrets**
   ```bash
   flyctl secrets set BASE_URL=https://hooklens.fly.dev
   ```

7. **Scale** (optional)
   ```bash
   flyctl scale count 2
   ```

**Cost**: Free tier (3 shared-cpu-1x VMs), paid plans from $2/month

---

## DigitalOcean

DigitalOcean App Platform offers straightforward deployment.

### Steps

1. **Connect GitHub**
   - Go to https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Select GitHub and authorize
   - Choose `hooklens` repository

2. **Configure**
   - **Name**: `hooklens`
   - **Branch**: `main`
   - **Source Directory**: `/`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000

3. **Environment Variables**
   ```
   NODE_ENV=production
   BASE_URL=https://your-app.ondigitalocean.app
   ```

4. **Deploy**
   - Click "Create Resources"
   - Wait for deployment

**Cost**: Starting at $5/month (no free tier)

---

## Docker

Deploy using Docker containers.

### Dockerfile

Already in your project root:

```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server/index.js"]
```

### Build and Run Locally

```bash
# Build image
docker build -t hooklens:1.0.0 .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e BASE_URL=http://localhost:3000 \
  --name hooklens \
  hooklens:1.0.0

# Check logs
docker logs -f hooklens

# Stop container
docker stop hooklens

# Remove container
docker rm hooklens
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  hooklens:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BASE_URL=http://localhost:3000
      - RATE_LIMIT_ENABLED=true
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

### Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag image
docker tag hooklens:1.0.0 vanshsharma27/hooklens:1.0.0
docker tag hooklens:1.0.0 vanshsharma27/hooklens:latest

# Push
docker push vanshsharma27/hooklens:1.0.0
docker push vanshsharma27/hooklens:latest
```

---

## Self-Hosted VPS

Deploy to your own server (Ubuntu/Debian).

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name pointed to your server IP

### Setup

1. **Update System**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. **Install Node.js 18+**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version  # Verify installation
   ```

3. **Install Git**
   ```bash
   sudo apt install -y git
   ```

4. **Clone Repository**
```bash
cd /var/www
sudo git clone https://github.com/Vansh-Sharma27/hooklens.git
cd hooklens
```

5. **Install Dependencies**
   ```bash
   npm install --production
   ```

6. **Configure Environment**
   ```bash
   sudo nano .env
   ```
   
   Add:
   ```env
   PORT=3000
   NODE_ENV=production
   BASE_URL=https://yourdomain.com
   RATE_LIMIT_ENABLED=true
   ```

7. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

8. **Start Application**
   ```bash
   pm2 start server/index.js --name hooklens
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

9. **Configure Nginx Reverse Proxy**
   ```bash
   sudo apt install -y nginx
   sudo nano /etc/nginx/sites-available/hooklens
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
       
       location /ws {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }
   }
   ```
   
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/hooklens /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Install SSL Certificate (Let's Encrypt)**
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com
    ```

11. **Configure Firewall**
    ```bash
    sudo ufw allow 'Nginx Full'
    sudo ufw enable
    ```

### Maintenance

```bash
# Check status
pm2 status

# View logs
pm2 logs hooklens

# Restart
pm2 restart hooklens

# Update application
cd /var/www/hooklens
git pull origin main
npm install --production
pm2 restart hooklens

# Monitor
pm2 monit
```

**Cost**: Starting from $5/month for VPS

---

## Environment Variables Reference

All platforms support these variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment (production/development) |
| `BASE_URL` | No | Auto-detected | Public URL for generating webhook URLs |
| `RATE_LIMIT_ENABLED` | No | true | Enable/disable rate limiting |

---

## Performance Considerations

### Scaling

- **Vertical**: Increase server resources (CPU/RAM)
- **Horizontal**: Use load balancer with multiple instances
- **Database**: Switch from in-memory to Redis for persistent storage

### Monitoring

Recommended tools:
- **Application**: PM2 (built-in monitoring)
- **Server**: Netdata, Prometheus + Grafana
- **Uptime**: UptimeRobot, Better Uptime
- **Logging**: Papertrail, Logtail

### Backup

For in-memory version (v1.0):
- No data persistence by design
- Consider Redis for future versions

---

## Troubleshooting

### WebSocket Connection Issues

1. Ensure proxy supports WebSocket upgrades
2. Check firewall rules
3. Verify `Upgrade` and `Connection` headers are passed through

### High Memory Usage

- Monitor endpoint count (max 10,000)
- Requests per endpoint capped at 100
- Cleanup runs every 5 minutes

### Rate Limiting Too Strict

Adjust in `server/config/constants.js`:
```javascript
RATE_LIMIT_MAX: 200,  // Increase from 100
```

---

## Next Steps

After deployment:
1. Test webhook functionality
2. Configure DNS and SSL
3. Set up monitoring
4. Add to README (deployed URL)
5. Share with community!

---

**Need Help?** Check the [GitHub Issues](https://github.com/Vansh-Sharma27/hooklens/issues) or discussions.
