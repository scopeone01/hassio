FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl jq && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

RUN mkdir -p /data/zeroclaw

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

LABEL io.hass.version="0.3.1" io.hass.type="addon"

CMD ["python3", "server.py"]
