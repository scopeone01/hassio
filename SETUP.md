# Backend Setup Guide

## Database Connection Error Fix

You're seeing `ECONNREFUSED` because PostgreSQL is not running. Here are your options:

## Option 1: Install and Setup PostgreSQL (Recommended for Production-like Setup)

### Install PostgreSQL on macOS

```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL
brew services start postgresql@14

# Or start manually
pg_ctl -D /usr/local/var/postgresql@14 start
```

### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql, run:
CREATE DATABASE facility_master;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE facility_master TO postgres;
\q
```

### Create .env File

Create a file named `.env` in the `facility-master-api` directory with:

```env
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
```

### Run Migrations

```bash
# From facility-master-api directory
npm run migrate
```

### Start Server

```bash
npm run dev
```

---

## Option 2: Use Docker PostgreSQL (Easiest)

```bash
# Start PostgreSQL in Docker
docker run --name facility-postgres \
  -e POSTGRES_DB=facility_master \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:14

# Check if running
docker ps

# Create .env file (same as above)

# Run migrations
npm run migrate

# Start server
npm run dev
```

### Stop/Start Docker PostgreSQL

```bash
# Stop
docker stop facility-postgres

# Start
docker start facility-postgres

# Remove (if needed)
docker rm -f facility-postgres
```

---

## Option 3: SQLite for Quick Development (No Database Server Needed)

If you just want to test the API quickly without setting up PostgreSQL, we can switch to SQLite:

### 1. Install SQLite Driver

```bash
npm install sqlite3
```

### 2. Update database.js

Change `facility-master-api/src/config/database.js` to:

```javascript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', // SQLite file
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

export default sequelize;

export async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        return false;
    }
}
```

### 3. Create .env

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3001,http://localhost:5173
```

### 4. Sync Models & Start

```bash
npm run dev
```

SQLite will auto-create the database file and tables.

---

## Verification

Once setup is complete, test the API:

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## Troubleshooting

### PostgreSQL not starting

```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Check PostgreSQL logs
tail -f /usr/local/var/log/postgresql@14.log

# Restart PostgreSQL
brew services restart postgresql@14
```

### Port 5432 already in use

```bash
# Find what's using port 5432
lsof -i :5432

# Kill the process if needed
kill -9 <PID>
```

### Permission denied

```bash
# Fix PostgreSQL data directory permissions
sudo chown -R $(whoami) /usr/local/var/postgresql@14
```

---

## Next Steps After Database Connection Works

1. ✅ Create .env file
2. ✅ Start database (PostgreSQL or Docker)
3. ✅ Run migrations: `npm run migrate`
4. ✅ Start server: `npm run dev`
5. ✅ Test API: `curl http://localhost:3000/health`
6. 📱 Connect iOS app to API
7. 🌐 Build PWA frontend

---

## Quick Command Reference

```bash
# Start PostgreSQL (Homebrew)
brew services start postgresql@14

# Start PostgreSQL (Docker)
docker start facility-postgres

# Start API
npm run dev

# Run migrations
npm run migrate

# Test API
curl http://localhost:3000/health
curl http://localhost:3000/api/v1
```

Choose **Option 2 (Docker)** if you have Docker installed - it's the easiest!








