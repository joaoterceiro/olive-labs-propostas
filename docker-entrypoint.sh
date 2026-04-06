#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️ Migrations skipped (DB may not be ready yet)"

echo "🌱 Running database seed..."
node prisma/seed.js || echo "⚠️ Seed skipped"

echo "🚀 Starting server..."
exec node server.js
