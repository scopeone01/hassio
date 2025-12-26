#!/usr/bin/with-contenv bashio
# ==============================================================================
# FacilityMaster API - s6 Service Script
# ==============================================================================

CONFIG_PATH=/data/options.json

bashio::log.info "Loading configuration..."

# Read config
DB_HOST=$(bashio::config 'database_host')
DB_PORT=$(bashio::config 'database_port')
DB_NAME=$(bashio::config 'database_name')
DB_USER=$(bashio::config 'database_user')
DB_PASSWORD=$(bashio::config 'database_password')
JWT_SECRET=$(bashio::config 'jwt_secret')
AUTO_MIGRATE=$(bashio::config 'auto_migrate')

# Export for Node.js
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD JWT_SECRET
export NODE_ENV=production
export PORT=3000

# Export custom routes
if bashio::config.exists 'custom_routes'; then
    export CUSTOM_ROUTES=$(bashio::config 'custom_routes' | jq -c '.')
else
    export CUSTOM_ROUTES="[]"
fi

# Generate JWT secret if empty
if [ -z "$JWT_SECRET" ]; then
    bashio::log.warning "No JWT secret, generating..."
    export JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
fi

bashio::log.info "Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Wait for MariaDB
bashio::log.info "Waiting for MariaDB..."
timeout=60
counter=0
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        bashio::log.error "MariaDB timeout!"
        exit 1
    fi
    sleep 1
done
bashio::log.info "MariaDB ready!"
sleep 2

# Run migrations
if [ "$AUTO_MIGRATE" = "true" ]; then
    bashio::log.info "Running migrations..."
    cd /app && node src/config/migrate.js || bashio::log.warning "Migration warnings"
fi

# Start server
bashio::log.info "Starting FacilityMaster API on port 3000..."
cd /app
exec node src/server.js
