ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js 20 LTS and tools
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    jq \
    netcat-openbsd \
    curl \
    bash

# Set working directory
WORKDIR /app

# Clone the API server from the repository
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cp -r /tmp/repo/package*.json /app/ && \
    cp -r /tmp/repo/src /app/ && \
    rm -rf /tmp/repo

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Labels
LABEL \
    io.hass.name="FacilityMaster API" \
    io.hass.description="Backend API Server" \
    io.hass.type="addon" \
    io.hass.version="1.0.1"

# Run startup script
CMD ["/run.sh"]
