FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    supervisor \
    xz-utils \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y git nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install clawdbot globally
RUN npm install -g clawdbot@latest

# Create clawdbot wrapper script
RUN echo '#!/bin/bash\nexec clawdbot "$@"' > /root/run_clawdbot.sh && \
    chmod +x /root/run_clawdbot.sh

# Create required directories
RUN mkdir -p /root/.clawdbot /root/clawd /var/log/supervisor

# Install Python dependencies
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || \
    grep -v "emergentintegrations" requirements.txt | pip install --no-cache-dir -r /dev/stdin

# Copy backend source
COPY backend/ .

# Copy supervisor config
COPY supervisord.docker.conf /etc/supervisor/conf.d/app.conf

EXPOSE 8001

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
