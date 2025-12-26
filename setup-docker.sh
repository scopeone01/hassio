#!/bin/bash

echo "🚀 FacilityMaster API - Quick Docker Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if PostgreSQL container exists
if docker ps -a | grep -q facility-postgres; then
    echo "📦 PostgreSQL container exists"
    
    # Check if it's running
    if docker ps | grep -q facility-postgres; then
        echo "✅ PostgreSQL is already running"
    else
        echo "🔄 Starting existing PostgreSQL container..."
        docker start facility-postgres
        sleep 2
    fi
else
    echo "📦 Creating new PostgreSQL container..."
    docker run --name facility-postgres \
        -e POSTGRES_DB=facility_master \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p 5432:5432 \
        -d postgres:14
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

echo ""
echo "✅ PostgreSQL is running on port 5432"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facility_master
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# JWT Authentication
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:5173
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npm run migrate"
echo "2. Start the server: npm run dev"
echo ""
echo "Useful commands:"
echo "- Stop database:   docker stop facility-postgres"
echo "- Start database:  docker start facility-postgres"
echo "- View logs:       docker logs facility-postgres"
echo "- Remove database: docker rm -f facility-postgres"
echo ""








