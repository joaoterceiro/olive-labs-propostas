#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || echo "⚠️ Migrations skipped (DB may not be ready yet)"

echo "🌱 Running database seed..."
node prisma/seed.js 2>/dev/null || echo "⚠️ Seed skipped"

echo "🚀 Starting server..."
exec node server.js
