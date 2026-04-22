#!/bin/sh
set -e

# Wait for Postgres to be reachable before running anything
echo "⏳ Waiting for database..."
RETRIES=30
until node -e "require('pg').Pool.prototype; new (require('pg').Pool)({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "❌ Database unreachable after 30 attempts"
    exit 1
  fi
  sleep 2
done
echo "✓ Database reachable"

echo "🔄 Running database migrations..."
node prisma/migrate.js

echo "🌱 Running database seed..."
node prisma/seed.js

echo "🚀 Starting server..."
exec node server.js
