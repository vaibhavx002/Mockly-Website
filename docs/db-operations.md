# DB Operations

## Overview
Mockly persists baseline/profile/session data in SQLite at:
- `backend/data/mockly.db`

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
- `MOCKLY_PERSISTENCE_DRIVER` (`sqlite-kv` default behavior; set to `prisma` for PostgreSQL)

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

Backfill existing SQLite user/attempt data into PostgreSQL:

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
npm run db:backup -- .\backend\backups\manual-backup.db
```

## Restore
Restore from a backup file:

```bash
npm run db:restore -- .\backend\backups\mockly-YYYYMMDD-HHMMSS.db
```
 
Restore to a custom destination file (safe dry run):

```bash
npm run db:restore -- .\backend\backups\mockly-YYYYMMDD-HHMMSS.db .\backend\data\mockly-restore-check.db
```

Notes:
- Script creates a safety backup of current DB before restore.
- Stop running server instances before restore to avoid lock conflicts.

## Baseline/Demo Migration
Import baseline artifacts and ensure demo records exist:

```bash
npm run db:migrate:baseline-demo
```

This migration:
- Ensures `demo@mockly.in` exists.
- Ensures demo personalization profile exists.
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
- `MOCKLY_ADMIN_EMAILS` (comma-separated, default includes `demo@mockly.in`)

Response includes:
- DB file path and size
- Row/namespace counts
- SQLite quick check result
- Runtime store diagnostics
- Persistence diagnostics (`driver`, and Prisma counts when enabled)

## Startup Diagnostics
On server start, DB diagnostics are printed before the startup URL line, for example:

`[db] path=... size=... rows=... quickCheck=ok`
