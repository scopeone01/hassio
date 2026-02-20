FROM alpine:3.20

# Cache bust to force fresh build
ARG CACHE_BUST=20260220_v6

# Install everything natively via Alpine packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-aiohttp \
    curl \
    jq \
    bash

# Verify python3 works during build
RUN /usr/bin/python3 --version && \
    /usr/bin/python3 -c "import aiohttp; print('aiohttp OK')"

WORKDIR /app

COPY --chmod=755 server.py /app/server.py

RUN mkdir -p /data/zeroclaw && \
    chmod -R 755 /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.5.1" io.hass.type="addon"

CMD ["/usr/bin/python3", "/app/server.py"]
