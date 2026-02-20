FROM node:20-alpine

RUN apk add --no-cache curl jq bash

WORKDIR /app

COPY server.js /app/server.js

COPY run.sh /run.sh
RUN chmod +x /run.sh

RUN mkdir -p /data/zeroclaw

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.7.2" io.hass.type="addon"

ENTRYPOINT []
CMD ["/bin/bash", "/run.sh"]
