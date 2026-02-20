FROM node:20-alpine

RUN apk add --no-cache curl jq git

WORKDIR /app

# Clone from GitHub instead of COPY — avoids ALL Windows permission/CRLF issues
ARG CACHE_BUST=20260220_v9
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cp /tmp/repo/zeroclaw-ai/server.js /app/server.js && \
    rm -rf /tmp/repo && \
    chmod 644 /app/server.js && \
    echo "=== server.js first line ===" && \
    head -1 /app/server.js && \
    echo "=== node check ===" && \
    node -c /app/server.js && \
    echo "=== BUILD OK ==="

RUN mkdir -p /data/zeroclaw

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.7.5" io.hass.type="addon"

ENTRYPOINT []
CMD ["node", "/app/server.js"]
