# Simple Node.js image without s6-overlay
FROM node:20-alpine

# Install tools
RUN apk add --no-cache git jq netcat-openbsd curl bash

WORKDIR /app

# Clone API server
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cp -r /tmp/repo/package*.json /app/ && \
    cp -r /tmp/repo/src /app/ && \
    rm -rf /tmp/repo

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:3000/health || exit 1

LABEL io.hass.version="1.0.4" io.hass.type="addon"

CMD ["/run.sh"]
