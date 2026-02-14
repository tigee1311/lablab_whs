#!/bin/bash
# OpsTwin AI — Vultr Deployment Script
# Run this ON the Vultr VM after cloning the repo
# Usage: bash deploy.sh

set -e

echo "============================================"
echo "  OpsTwin AI — Vultr Deployment"
echo "============================================"

# 1. Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo "[1/6] Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[1/6] Node.js already installed: $(node -v)"
fi

# 2. Install dependencies
echo "[2/6] Installing backend dependencies..."
cd backend
npm install --omit=dev
npm install tsx typescript @types/better-sqlite3 @types/cors @types/express @types/uuid @types/ws
npm run build
cd ..

echo "[3/6] Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# 3. Copy frontend build to backend public dir
echo "[4/6] Copying frontend build to backend..."
rm -rf backend/public
cp -r frontend/dist backend/public

# 4. Create data directory
mkdir -p backend/data

# 5. Set up .env if not exists
if [ ! -f backend/.env ]; then
    echo "[5/6] Creating .env file..."
    echo "GEMINI_API_KEY=${GEMINI_API_KEY:-REPLACE_ME}"
    cat > backend/.env <<'ENVEOF'
GEMINI_API_KEY=REPLACE_ME
PORT=3001
NODE_ENV=production
CORS_ORIGIN=*
DB_PATH=./data/opstwin.db
SIMULATION_TICK_MS=500
ENVEOF
    echo "⚠️  Edit backend/.env and set your GEMINI_API_KEY!"
else
    echo "[5/6] .env already exists, skipping..."
fi

# 6. Install PM2 and start
echo "[6/6] Starting with PM2..."
npm install -g pm2 2>/dev/null || true
cd backend
pm2 delete opstwin-ai 2>/dev/null || true
pm2 start dist/server.js --name opstwin-ai
pm2 save
pm2 startup 2>/dev/null || true
cd ..

echo ""
echo "============================================"
echo "  ✅ OpsTwin AI is LIVE"
echo "  Open: http://$(curl -s ifconfig.me):3001"
echo "============================================"
