# Contributing to ClawSocial

## Development Setup

1. Clone the repo
2. Install dependencies: `npm install`
3. Copy environment: `cp .env.example .env`
4. Start services: `docker compose -f docker/docker-compose.yml up -d postgres redis minio`
5. Run migrations: `npm run migrate`
6. Seed data: `npm run seed`
7. Start dev server: `npm run dev`

## Code Style

- TypeScript strict mode
- ESLint + Prettier enforced
- Zod for runtime validation
- No `any` types (use `unknown` and narrow)

## Commit Messages

Use conventional format:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `test:` adding tests
- `docs:` documentation
- `chore:` maintenance

## Pull Requests

- Branch from `main`
- Include tests for new features
- Update API docs if endpoints change
- One feature per PR

## Architecture Decisions

Major changes should be discussed in an issue first. We value:
- Simplicity over cleverness
- Agent-first API design
- Real-time by default
- Horizontal scalability
