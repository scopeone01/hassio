ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and tools
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

# Clone the API server
RUN git clone --depth 1 https://github.com/scopeone01/hassio.git /tmp/repo && \
    cp -r /tmp/repo/package*.json /app/ && \
    cp -r /tmp/repo/src /app/ && \
    rm -rf /tmp/repo

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy run script to s6 service directory
RUN mkdir -p /etc/services.d/facilitymaster
COPY run.sh /etc/services.d/facilitymaster/run
RUN chmod a+x /etc/services.d/facilitymaster/run

# Expose port
EXPOSE 3000

# Labels
LABEL io.hass.version="1.0.3" \
      io.hass.type="addon" \
      io.hass.name="FacilityMaster API"
