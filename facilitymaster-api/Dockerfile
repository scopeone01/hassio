ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js 20 LTS and tools
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    netcat-openbsd \
    curl

# Set working directory
WORKDIR /app

# Clone the API server from the same repository
# The build context is only the add-on folder, so we need to get the source
ARG BUILD_VERSION=1.0.0
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cp -r /tmp/repo/package*.json /app/ && \
    cp -r /tmp/repo/src /app/ && \
    rm -rf /tmp/repo

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy startup script from build context
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Create non-root user for security
RUN addgroup -g 1000 node 2>/dev/null || true && \
    adduser -u 1000 -G node -s /bin/sh -D node 2>/dev/null || true && \
    chown -R node:node /app

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Labels for Home Assistant
LABEL \
    io.hass.name="FacilityMaster API" \
    io.hass.description="Backend API Server für FacilityMaster iOS App" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="ScopeOne <support@scopeone.de>"

# Run startup script
CMD ["/run.sh"]
