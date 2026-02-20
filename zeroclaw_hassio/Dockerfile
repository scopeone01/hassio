# ────────────────────────────────────────────────────────────────────
# ZeroClaw Home Assistant Add-on — Dockerfile
# ────────────────────────────────────────────────────────────────────
# Multi-stage build:
#   1. builder — compile ZeroClaw from source (Rust 1.93)
#   2. runtime — hassio-addons base image with s6-overlay + bashio
# ────────────────────────────────────────────────────────────────────

# ── Stage 1: Build the ZeroClaw binary ──────────────────────────────
FROM rust:1.93-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Cache dependency layer
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates/ crates/
RUN mkdir src && echo 'fn main() {}' > src/main.rs && \
    echo 'pub fn lib() {}' > src/lib.rs && \
    cargo build --release --locked 2>/dev/null || true && \
    rm -rf src/

# Build the actual binary
COPY src/ src/
COPY benches/ benches/
RUN cargo build --release --locked && \
    strip target/release/zeroclaw

# ── Stage 2: Runtime (HA Add-on base image) ─────────────────────────
FROM ghcr.io/hassio-addons/debian-base:7.6.0

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Copy binary
COPY --from=builder /build/target/release/zeroclaw /usr/bin/zeroclaw

# Copy s6-overlay service definition
COPY rootfs/ /

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
    io.hass.version="0.1.0"
