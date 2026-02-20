FROM node:20-alpine

ARG CACHE_BUST=20260220_v8

RUN apk add --no-cache python3 py3-aiohttp curl jq bash dos2unix

WORKDIR /app

COPY server.py /app/server.py
COPY run.sh /run.sh

# Fix Windows CRLF line endings + set permissions
RUN dos2unix /run.sh /app/server.py && \
    chmod +x /run.sh && \
    chmod 644 /app/server.py && \
    echo "=== BUILD CHECK ===" && \
    python3 --version && \
    python3 -c "import aiohttp; print('aiohttp OK')" && \
    head -1 /run.sh | cat -A && \
    echo "=== BUILD OK ==="

RUN mkdir -p /data/zeroclaw

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.6.1" io.hass.type="addon"

CMD ["/run.sh"]
