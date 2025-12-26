#!/bin/bash
set -e

CONFIG=/data/options.json

echo "[FacilityMaster] Starting..."

# Load config with defaults
export DB_HOST=$(jq -r '.database_host // "core-mariadb"' $CONFIG 2>/dev/null || echo "core-mariadb")
export DB_PORT=$(jq -r '.database_port // 3306' $CONFIG 2>/dev/null || echo "3306")
export DB_NAME=$(jq -r '.database_name // "facility_master"' $CONFIG 2>/dev/null || echo "facility_master")
export DB_USER=$(jq -r '.database_user // "facilitymaster"' $CONFIG 2>/dev/null || echo "facilitymaster")
export DB_PASSWORD=$(jq -r '.database_password // ""' $CONFIG 2>/dev/null || echo "")
export JWT_SECRET=$(jq -r '.jwt_secret // ""' $CONFIG 2>/dev/null || echo "")
export AUTO_MIGRATE=$(jq -r '.auto_migrate // true' $CONFIG 2>/dev/null || echo "true")
export CUSTOM_ROUTES=$(jq -c '.custom_routes // []' $CONFIG 2>/dev/null || echo "[]")
export NODE_ENV=production
export PORT=3000

# Generate JWT if empty
[ -z "$JWT_SECRET" ] && export JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)

echo "[FacilityMaster] DB: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Wait for MariaDB
echo "[FacilityMaster] Waiting for MariaDB..."
for i in $(seq 1 60); do
    nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null && break
    [ $i -eq 60 ] && echo "[ERROR] MariaDB timeout" && exit 1
    sleep 1
done
echo "[FacilityMaster] MariaDB ready"

# Migrate
[ "$AUTO_MIGRATE" = "true" ] && cd /app && node src/config/migrate.js || true

# Start
echo "[FacilityMaster] Starting API server on port 3000..."
cd /app
exec node src/server.js
