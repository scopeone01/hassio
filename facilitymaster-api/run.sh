#!/bin/bash
# ==============================================================================
# FacilityMaster API - Home Assistant Add-on Startup Script
# ==============================================================================

set -e

# ==============================================================================
# Load configuration from Home Assistant options.json
# ==============================================================================

CONFIG_PATH=/data/options.json

echo "[INFO] Loading configuration..."

# Read config values using jq
export DB_HOST=$(jq -r '.database_host // "core-mariadb"' $CONFIG_PATH)
export DB_PORT=$(jq -r '.database_port // 3306' $CONFIG_PATH)
export DB_NAME=$(jq -r '.database_name // "facility_master"' $CONFIG_PATH)
export DB_USER=$(jq -r '.database_user // "facilitymaster"' $CONFIG_PATH)
export DB_PASSWORD=$(jq -r '.database_password // ""' $CONFIG_PATH)
export JWT_SECRET=$(jq -r '.jwt_secret // ""' $CONFIG_PATH)
export AUTO_MIGRATE=$(jq -r '.auto_migrate // true' $CONFIG_PATH)
export NODE_ENV=production
export PORT=3000

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "null" ]; then
    echo "[WARN] No JWT secret configured, generating random secret..."
    export JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
fi

echo "[INFO] Configuration loaded:"
echo "  Database Host: ${DB_HOST}:${DB_PORT}"
echo "  Database Name: ${DB_NAME}"
echo "  Database User: ${DB_USER}"

# ==============================================================================
# Wait for MariaDB to be ready
# ==============================================================================

echo "[INFO] Waiting for MariaDB at ${DB_HOST}:${DB_PORT}..."

timeout=60
counter=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "[ERROR] Timeout waiting for MariaDB after ${timeout} seconds!"
        exit 1
    fi
    
    if [ $((counter % 10)) -eq 0 ]; then
        echo "[INFO] Still waiting for MariaDB... (${counter}/${timeout}s)"
    fi
    
    sleep 1
done

echo "[INFO] MariaDB is ready!"
sleep 2

# ==============================================================================
# Run database migrations if enabled
# ==============================================================================

if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "[INFO] Running database migrations..."
    cd /app
    node src/config/migrate.js || echo "[WARN] Migration completed with warnings"
fi

# ==============================================================================
# Start the API server
# ==============================================================================

echo "=============================================="
echo " Starting FacilityMaster API Server..."
echo "=============================================="
echo ""
echo " API available at: http://homeassistant.local:3000"
echo " Health check: /health"
echo ""

cd /app
exec node src/server.js
