#!/bin/bash
# MoltBot AWS Setup Script
# Run this on your EC2 instance as: bash setup.sh

set -e

echo "======================================"
echo "  MoltBot AWS Setup - Starting..."
echo "======================================"

# 1. Update system
echo "[1/6] Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Install Docker
echo "[2/6] Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 3. Install git
echo "[3/6] Installing Git..."
sudo apt-get install -y git

# 4. Clone the repository
echo "[4/6] Downloading MoltBot code..."
cd /home/ubuntu
if [ -d "moltbot" ]; then
    cd moltbot && git pull
else
    git clone https://github.com/Taha-San5/Taha.git moltbot
    cd moltbot
fi

# 5. Create .env file
echo "[5/6] Setting up configuration..."
cat > /home/ubuntu/moltbot/backend/.env << 'ENVFILE'
MONGO_URL=REPLACE_WITH_MONGODB_URL
DB_NAME=moltbot_app
CORS_ORIGINS=*
EMERGENT_API_KEY=sk-emergent-50b980549D8B0E69f9
EMERGENT_BASE_URL=https://integrations.emergentagent.com/llm
PORT=8001
ENVFILE

# 6. Build and run Docker
echo "[6/6] Building and starting MoltBot..."
cd /home/ubuntu/moltbot
sudo docker build -t moltbot . 2>&1
sudo docker stop moltbot 2>/dev/null || true
sudo docker rm moltbot 2>/dev/null || true
sudo docker run -d \
    --name moltbot \
    --restart always \
    -p 8001:8001 \
    --env-file backend/.env \
    moltbot

echo ""
echo "======================================"
echo "  MoltBot is running!"
echo "  Open port 8001 in your AWS Security Group"
echo "  Your API: http://YOUR_EC2_IP:8001"
echo "======================================"
