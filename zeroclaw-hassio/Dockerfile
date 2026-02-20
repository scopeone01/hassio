# ────────────────────────────────────────────────────────────────────
# ZeroClaw Home Assistant Add-on — Dockerfile
# ────────────────────────────────────────────────────────────────────
# Clones ZeroClaw from GitHub and compiles from source.
# ────────────────────────────────────────────────────────────────────

# ── Stage 1: Build the ZeroClaw binary ──────────────────────────────
FROM rust:1.93-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Clone ZeroClaw source from GitHub
ARG CACHE_BUST=20260220
RUN git clone --depth 1 https://github.com/zeroclaw-labs/zeroclaw.git . && \
    echo "Cloned ZeroClaw at $(date)"

# Build the binary with mqtt feature
RUN cargo build --release --features mqtt && \
    strip target/release/zeroclaw

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM debian:bookworm-slim

# Install runtime deps + bashio + s6-overlay for HA add-on
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl jq bash && \
    rm -rf /var/lib/apt/lists/*

# Install s6-overlay v3
ARG S6_OVERLAY_VERSION="3.1.6.2"
RUN curl -L -s "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" | tar Jxpf - -C / && \
    curl -L -s "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-$(uname -m).tar.xz" | tar Jxpf - -C /

# Install bashio
RUN curl -L -s "https://github.com/hassio-addons/bashio/archive/refs/tags/v0.16.2.tar.gz" | tar xzf - -C /tmp && \
    mv /tmp/bashio-0.16.2/lib /usr/lib/bashio && \
    ln -s /usr/lib/bashio/bashio /usr/bin/bashio && \
    rm -rf /tmp/bashio-*

# Copy binary from builder
COPY --from=builder /build/target/release/zeroclaw /usr/bin/zeroclaw

# Copy s6-overlay service definition
COPY rootfs/ /

# Make run scripts executable
RUN chmod +x /etc/services.d/zeroclaw/run /etc/services.d/zeroclaw/finish 2>/dev/null || true

# Create data directory
RUN mkdir -p /data/zeroclaw

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD curl -sf http://127.0.0.1:3000/health || exit 1

# Labels for HA add-on
LABEL \
    io.hass.name="ZeroClaw AI Agent" \
    io.hass.description="Autonomous AI agent for Home Assistant" \
    io.hass.arch="amd64|aarch64" \
    io.hass.type="addon" \
    io.hass.version="0.1.0"

ENTRYPOINT ["/init"]
