#!/usr/bin/env bash
set -e

echo "[zeroclaw] Starting ZeroClaw AI Agent v0.6.0..."
echo "[zeroclaw] Python: $(python3 --version 2>&1)"

# Ensure server.py is readable
if [ ! -f /app/server.py ]; then
    echo "[zeroclaw] ERROR: /app/server.py not found!"
    ls -la /app/
    exit 1
fi

echo "[zeroclaw] server.py found: $(ls -la /app/server.py)"

exec python3 /app/server.py
