# Mockly

Mockly is a government-exam mock test platform prototype with exam discovery, launch flows, analytics, personalization, and a local API server.

## Stack

- Node.js + Express backend
- Static frontend in `frontend/`
- JSON fallback persistence for local use in `backend/data/mockly-store.json`
- Optional Prisma + PostgreSQL persistence for auth, attempts, refresh sessions, and personalization

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file from `.env.example` and set at least:

```bash
MOCKLY_ACCESS_TOKEN_SECRET=your-long-random-secret
MOCKLY_PERSISTENCE_DRIVER=json-kv
```

3. Start the app:

```bash
npm start
```

The server now fails fast if `MOCKLY_ACCESS_TOKEN_SECRET` is missing, and demo-user bootstrap is disabled by default.

## Scripts

- `npm start` - run the local server
- `npm run dev` - run the local server in development mode
- `npm run lint` - syntax-check backend and frontend JavaScript
- `npm run test` - run smoke test, auth integration test, and question validation
- `npm run smoke-test` - quick route and API validation
- `npm run auth-integration-test` - auth/session/CSRF validation
- `npm run validate-questions` - question-bank quality checks
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate:dev` - create/apply dev migrations
- `npm run prisma:migrate:deploy` - apply migrations in deployment

## Persistence Modes

### `json-kv`

- Default local fallback mode
- Stores lightweight app state in `backend/data/mockly-store.json`
- Good for local demos and basic testing without PostgreSQL

### `prisma`

- Uses Prisma with PostgreSQL
- Requires `DATABASE_URL`
- Intended for more realistic auth/attempt persistence

## Demo Mode

Demo account bootstrap is disabled by default. Enable it only for controlled local demos or automated checks:

```bash
MOCKLY_ENABLE_DEMO_BOOTSTRAP=true
MOCKLY_ADMIN_EMAILS=demo@mockly.in
```

## Project Layout

- `backend/` - Express server, persistence helpers, diagnostics, and validation scripts
- `frontend/` - landing page, launch flow, dashboard UI, and mock experience
- `docs/` - operational notes and product planning docs
- `prisma/` - Prisma schema and migrations

## Deployment Notes

- Set a stable `MOCKLY_ACCESS_TOKEN_SECRET`
- Keep `MOCKLY_ENABLE_DEMO_BOOTSTRAP=false`
- Set explicit `MOCKLY_ADMIN_EMAILS`
- Use `MOCKLY_PERSISTENCE_DRIVER=prisma` with a valid `DATABASE_URL`
- Run `npm run test` before release
