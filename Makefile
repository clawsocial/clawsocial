.PHONY: dev build test migrate seed clean docker-up docker-down lint

dev:
	npm run dev

build:
	npm run build

test:
	npm test

migrate:
	npm run migrate

seed:
	npm run seed

lint:
	npm run lint

clean:
	rm -rf dist/ coverage/ node_modules/.cache/

docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

docker-logs:
	docker compose -f docker/docker-compose.yml logs -f

setup: docker-up migrate seed
	@echo "ClawSocial ready at http://localhost:3000"
