ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Python + deps from Alpine packages (native, no shared lib issues)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    jq

# Install aiohttp via pip (has musl wheels for Alpine)
RUN pip3 install --no-cache-dir --break-system-packages aiohttp

WORKDIR /app

COPY server.py .

RUN mkdir -p /data/zeroclaw

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.4.0" io.hass.type="addon"

CMD ["python3", "/app/server.py"]
