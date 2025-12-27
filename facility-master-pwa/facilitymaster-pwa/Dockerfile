# ============================================
# Stage 1: Build the PWA
# ============================================
FROM node:20-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

# Clone PWA source code (with cache busting)
ARG CACHE_BUST=20251227_163238
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cd /tmp/repo/facility-master-pwa && \
    cp -r . /build/ && \
    rm -rf /tmp/repo && \
    echo "📦 PWA code cloned at $(date)"

# Install dependencies
RUN npm ci

# Build the PWA for production
RUN npm run build && \
    echo "✅ Build complete" && \
    ls -la /build/dist/

# ============================================
# Stage 2: Serve with lightweight HTTP server
# ============================================
FROM node:20-alpine

# Install http-server globally
RUN npm install -g http-server && \
    apk add --no-cache bash curl

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /build/dist /app/dist

# Copy startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
    CMD curl -f http://localhost:8080/ || exit 1

LABEL io.hass.version="1.0.5" io.hass.type="addon"

CMD ["/run.sh"]
