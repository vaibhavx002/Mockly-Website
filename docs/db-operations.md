# DB Operations

## Overview
Mockly persists fallback baseline/profile/session data in a JSON key-value store at:
- `backend/data/mockly-store.json`

Auth users, refresh sessions, and attempts can run on PostgreSQL + Prisma when enabled.

To enable relational persistence:

1. Set `MOCKLY_PERSISTENCE_DRIVER=prisma`
2. Set `DATABASE_URL=postgresql://...`
3. Run Prisma migration + generation commands (below)

Nightly backup rotation runs automatically when server starts in standalone mode (`npm start`), and keeps the latest `N` backups.

Environment controls:
- `MOCKLY_DB_NIGHTLY_BACKUP_ENABLED` (`true` by default)
- `MOCKLY_DB_BACKUP_KEEP` (`14` by default)
- `MOCKLY_DB_BACKUP_HOUR` (`2` by default)
- `MOCKLY_DB_BACKUP_MINUTE` (`15` by default)
- `MOCKLY_PERSISTENCE_DRIVER` (`json-kv` default behavior; set to `prisma` for PostgreSQL)
- `MOCKLY_ACCESS_TOKEN_SECRET` (required; server startup fails if missing)
- `MOCKLY_ENABLE_DEMO_BOOTSTRAP` (`false` by default; set to `true` only for local demo/test use)
- `MOCKLY_ADMIN_EMAILS` (comma-separated admin emails; no default admin is created automatically)

## Prisma Setup

Generate client:

```bash
npm run prisma:generate
```

Create/apply dev migration:

```bash
npm run prisma:migrate:dev
```

Apply migrations in deployment:

```bash
npm run prisma:migrate:deploy
```

Backfill existing fallback-store user/attempt data into PostgreSQL:

```bash
npm run db:migrate:sqlite-to-prisma
```

## Backup
Create a timestamped backup in `backend/backups/`:

```bash
npm run db:backup
```

This command also applies retention rotation using `MOCKLY_DB_BACKUP_KEEP`.

Create backup at a custom path:

```bash
npm run db:backup -- .\backend\backups\manual-backup.json
```

## Restore
Restore from a backup file:

```bash
npm run db:restore -- .\backend\backups\mockly-YYYYMMDD-HHMMSS.json
```
 
Restore to a custom destination file (safe dry run):

```bash
npm run db:restore -- .\backend\backups\mockly-YYYYMMDD-HHMMSS.json .\backend\data\mockly-restore-check.json
```

Notes:
- Script creates a safety backup of current DB before restore.
- Stop running server instances before restore to avoid lock conflicts.

## Baseline/Demo Migration
Import baseline artifacts and optionally seed demo records:

```bash
npm run db:migrate:baseline-demo
```

This migration:
- Seeds `demo@mockly.in` only when you intentionally run the script.
- Ensures demo personalization profile exists when the demo account is present.
- Imports `backend/baseline/phase0-baseline-latest.json` into DB records.
- Indexes baseline snapshot files for reference.

## DB Doctor
Run a single diagnostics command that performs:
- backup + retention rotation
- DB health snapshot (before and after)
- migration dry-run summary for baseline/demo readiness

```bash
npm run db:doctor
```

## Health Endpoint
Admin users only can check DB health:

- `GET /api/db/health`

Admin list is controlled by:
- `MOCKLY_ADMIN_EMAILS` (comma-separated, set this explicitly in `.env`)

Response includes:
- DB file path and size
- Row/namespace counts
- SQLite quick check result
- Runtime store diagnostics
- Persistence diagnostics (`driver`, and Prisma counts when enabled)

## Startup Diagnostics
On server start, DB diagnostics are printed before the startup URL line, for example:

`[db] path=... size=... rows=... quickCheck=ok`
