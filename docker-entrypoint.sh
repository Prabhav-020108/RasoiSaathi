#!/bin/sh
set -e

echo "Starting RasoiSaathi..."
echo "Running Prisma schema sync..."
node ./node_modules/prisma/build/index.js db push --skip-generate

echo "Seeding demo data if database is empty..."
node prisma-dist/prisma/seed.js

echo "Launching Next.js server..."
exec node server.js
