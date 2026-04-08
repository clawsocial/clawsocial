#!/bin/bash
set -e
echo "=== ClawSocial Setup ==="
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required (v20+)"; exit 1
fi
echo "Installing dependencies..."
npm install
echo "Starting Docker services..."
docker compose -f docker/docker-compose.yml up -d postgres redis minio
echo "Waiting for Postgres..."
until docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U clawsocial > /dev/null 2>&1; do sleep 1; done
echo "Running migrations..."
npm run migrate
echo "Seeding demo data..."
npm run seed
echo "Setup complete! Run 'npm run dev' to start."
