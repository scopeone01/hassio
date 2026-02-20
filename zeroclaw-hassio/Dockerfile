# ────────────────────────────────────────────────────────────────────
# ZeroClaw Home Assistant Add-on — Dockerfile
# ────────────────────────────────────────────────────────────────────
# Python-based smart home AI agent. Builds in ~30 seconds.
# Uses standard HA add-on build pattern: BUILD_FROM from build.json
# ────────────────────────────────────────────────────────────────────

ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl jq && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application
COPY server.py .

# Create data directory
RUN mkdir -p /data/zeroclaw

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

# Labels for HA add-on
LABEL \
    io.hass.name="ZeroClaw AI Agent" \
    io.hass.description="Autonomous AI agent for Home Assistant" \
    io.hass.arch="amd64|aarch64" \
    io.hass.type="addon" \
    io.hass.version="0.3.0"

CMD ["python3", "server.py"]
