#!/bin/bash
set -e

echo "[zeroclaw] Starting ZeroClaw AI Agent v0.7.0..."
echo "[zeroclaw] Node: $(node --version)"

cd /app
exec node server.js
