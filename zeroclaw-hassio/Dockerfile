FROM node:20-alpine

ARG CACHE_BUST=20260220_v7

RUN apk add --no-cache python3 py3-aiohttp curl jq bash

WORKDIR /app

COPY server.py /app/server.py
COPY run.sh /run.sh
RUN chmod +x /run.sh && chmod 644 /app/server.py

RUN mkdir -p /data/zeroclaw

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.6.0" io.hass.type="addon"

CMD ["/run.sh"]
