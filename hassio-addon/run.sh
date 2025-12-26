#!/usr/bin/with-contenv bashio
# -*- bash -*-

# ==============================================================================
# FacilityMaster API - Home Assistant Add-on Startup Script
# ==============================================================================

set -e

# ==============================================================================
# Load configuration from Home Assistant
# ==============================================================================

bashio::log.info "Loading configuration..."

export DB_HOST=$(bashio::config 'database_host')
export DB_PORT=$(bashio::config 'database_port')
export DB_NAME=$(bashio::config 'database_name')
export DB_USER=$(bashio::config 'database_user')
export DB_PASSWORD=$(bashio::config 'database_password')
export JWT_SECRET=$(bashio::config 'jwt_secret')
export JWT_EXPIRES_IN=$(bashio::config 'jwt_expires_in')
export LOG_LEVEL=$(bashio::config 'log_level')
export NODE_ENV=production
export PORT=3000

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    bashio::log.warning "No JWT secret configured, generating random secret..."
    export JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    bashio::log.info "Generated JWT secret (not persistent - configure in add-on options)"
fi

bashio::log.info "Configuration loaded:"
bashio::log.info "  Database Host: ${DB_HOST}:${DB_PORT}"
bashio::log.info "  Database Name: ${DB_NAME}"
bashio::log.info "  Database User: ${DB_USER}"
bashio::log.info "  Log Level: ${LOG_LEVEL}"

# ==============================================================================
# Wait for MariaDB to be ready
# ==============================================================================

bashio::log.info "Waiting for MariaDB at ${DB_HOST}:${DB_PORT}..."

timeout=60
counter=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        bashio::log.error "Timeout waiting for MariaDB after ${timeout} seconds!"
        bashio::log.error "Please ensure the MariaDB add-on is installed and running."
        bashio::log.error "Database host: ${DB_HOST}:${DB_PORT}"
        exit 1
    fi
    
    if [ $((counter % 10)) -eq 0 ]; then
        bashio::log.info "Still waiting for MariaDB... (${counter}/${timeout}s)"
    fi
    
    sleep 1
done

bashio::log.info "✅ MariaDB is ready!"

# Give MariaDB a moment to fully initialize
sleep 2

# ==============================================================================
# Run database migrations if enabled
# ==============================================================================

if bashio::config.true 'auto_migrate'; then
    bashio::log.info "Running database migrations..."
    
    cd /app
    if node src/config/migrate.js; then
        bashio::log.info "✅ Migrations completed successfully"
    else
        bashio::log.warning "⚠️ Migration completed with warnings (may be expected)"
    fi
fi

# ==============================================================================
# Seed demo data if enabled
# ==============================================================================

if bashio::config.true 'auto_seed_demo_data'; then
    bashio::log.info "Seeding demo data..."
    
    cd /app
    if npm run seed:users 2>/dev/null; then
        bashio::log.info "✅ Demo data seeded"
    else
        bashio::log.warning "⚠️ Demo data seeding skipped (may already exist)"
    fi
fi

# ==============================================================================
# Start the API server
# ==============================================================================

bashio::log.info "=============================================="
bashio::log.info "Starting FacilityMaster API Server..."
bashio::log.info "=============================================="
bashio::log.info ""
bashio::log.info "API will be available at:"
bashio::log.info "  - http://homeassistant.local:3000"
bashio::log.info "  - Via Home Assistant Ingress"
bashio::log.info ""
bashio::log.info "Health check endpoint: /health"
bashio::log.info ""

cd /app
exec node src/server.js

