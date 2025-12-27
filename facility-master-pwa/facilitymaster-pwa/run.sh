#!/bin/bash
set -e

echo "[FacilityMaster PWA] Starting web server..."

cd /app/dist

echo "[FacilityMaster PWA] Serving PWA on port 8080..."
echo "[FacilityMaster PWA] Access at: http://YOUR_HOME_ASSISTANT_IP:8080"

exec http-server \
  -p 8080 \
  -a 0.0.0.0 \
  --cors \
  -c-1 \
  --gzip \
  -d false
