FROM node:20-alpine

RUN apk add --no-cache curl jq

WORKDIR /app

COPY server.js /app/server.js

RUN mkdir -p /data/zeroclaw

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.7.3" io.hass.type="addon"

ENTRYPOINT []
CMD ["node", "/app/server.js"]
