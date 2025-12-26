ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js 20 LTS
RUN apk add --no-cache \
    nodejs \
    npm \
    netcat-openbsd \
    curl

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy API server source files
COPY src ./src

# Copy startup script
COPY hassio-addon/run.sh /run.sh
RUN chmod a+x /run.sh

# Create non-root user for security
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node && \
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
    io.hass.version="1.0.0" \
    maintainer="ScopeOne <support@scopeone.de>"

# Run startup script
CMD ["/run.sh"]

