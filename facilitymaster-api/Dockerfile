# Node.js Alpine with build tools for native modules
FROM node:20-alpine

# Install build dependencies and tools
RUN apk add --no-cache \
    git jq netcat-openbsd curl bash \
    python3 make g++

WORKDIR /app

# Clone API server (with cache busting - updated timestamp forces rebuild)
ARG CACHE_BUST=20251227_035700
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    ls -la /tmp/repo/ && \
    cp -r /tmp/repo/package*.json /app/ && \
    cp -r /tmp/repo/src /app/ && \
    rm -rf /tmp/repo && \
    echo "📦 Code cloned at $(date)" && \
    echo "✅ Checking admin.js:" && \
    head -20 /app/src/routes/admin.js

# Install ALL dependencies (including devDependencies for native builds)
# Then rebuild bcrypt for Alpine
RUN npm ci && \
    npm rebuild bcrypt --build-from-source

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Copy startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:3000/health || exit 1

LABEL io.hass.version="1.1.7" io.hass.type="addon"

CMD ["/run.sh"]
