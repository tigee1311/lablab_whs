# OpsTwin AI — Vultr Deployment Guide

## Prerequisites
- A Vultr VM (Ubuntu 22.04+ recommended, 2+ vCPU, 4GB+ RAM)
- Domain name (optional, for HTTPS)
- Gemini API key from Google AI Studio

## Option 1: Docker Deployment (Recommended)

### 1. SSH into your Vultr VM
```bash
ssh root@YOUR_VULTR_IP
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Clone the repo
```bash
git clone https://github.com/tigee1311/lablab_whs.git
cd lablab_whs
```

### 4. Set environment variables
```bash
echo "GEMINI_API_KEY=your_key_here" > .env
```

### 5. Build and run
```bash
docker compose up -d --build
```

### 6. Access the app
Open `http://YOUR_VULTR_IP:3001` in your browser.

## Option 2: Direct Node.js Deployment

### 1. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### 2. Clone and install
```bash
git clone https://github.com/tigee1311/lablab_whs.git
cd lablab_whs

cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..

# Copy frontend build to backend public
cp -r frontend/dist backend/public
```

### 3. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env with your GEMINI_API_KEY
nano .env
```

### 4. Run with PM2 (process manager)
```bash
npm install -g pm2
cd backend
NODE_ENV=production pm2 start dist/server.js --name opstwin-ai
pm2 save
pm2 startup
```

## Nginx Reverse Proxy (Optional, for port 80/443)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
apt install nginx -y
# Copy above config to /etc/nginx/sites-available/opstwin
ln -s /etc/nginx/sites-available/opstwin /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Firewall

```bash
ufw allow 3001/tcp   # or 80/443 if using nginx
ufw enable
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| GEMINI_API_KEY | (required) | Google Gemini API key |
| PORT | 3001 | HTTP/WS server port |
| CORS_ORIGIN | * | Allowed CORS origins |
| DB_PATH | ./data/opstwin.db | SQLite database path |
| SIMULATION_TICK_MS | 500 | Simulation tick interval |
| NODE_ENV | production | Environment mode |
