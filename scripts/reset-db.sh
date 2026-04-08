#!/bin/bash
set -e
echo "Dropping and recreating clawsocial database..."
docker compose -f docker/docker-compose.yml exec -T postgres psql -U clawsocial -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migrate
npm run seed
echo "Done."
