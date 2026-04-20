# Phase 0 Baseline and Freeze Checklist

Use this document to lock current behavior before Phase 1 security hardening.

## Goal
- Capture the current system state in a repeatable way.
- Detect whether runtime behavior matches source (especially for timer auto-submit and result layout).
- Freeze a known baseline so later phases can be compared without guesswork.

## 1) Environment
- Use Node 18+.
- Install dependencies with `npm install`.
- Start from repository root.

## 2) Automated Baseline Snapshot
Run:

```bash
npm run phase0-baseline
```

Expected outcome:
- Script exits with code 0.
- A fresh baseline snapshot is written to:
  - `backend/baseline/phase0-baseline-latest.json`
  - `backend/baseline/phase0-baseline-<timestamp>.json`

The snapshot includes:
- API health and launch checks.
- Auth signup/login sanity checks.
- Current auth risk behavior (email-scoped endpoints without token).
- Password hashing detector and in-memory store detector.
- Mock window source checks for auto-submit hook and result breakdown/explanation sections.
- Per-exam paper profile summary (question count and duration).

## 3) Smoke and Data Validation
Run:

```bash
npm run smoke-test
npm run validate-questions
```

Expected outcome:
- Both commands exit with code 0.
- No schema mismatch in papers/questions.

## 4) Manual Critical Flow Pass
Validate these paths in browser:
- Signup and login with a fresh account.
- Launch one SSC and one RRB mock.
- Confirm timer reaches 00:00 behavior and final state lock.
- Confirm result layout shows score KPI, section breakdown, and question review/explanation table.
- Confirm dashboard shows recent attempts.

## 5) Source vs Runtime Drift Check
If runtime does not match source behavior:
- Hard refresh page (`Ctrl+F5`).
- Confirm server serving expected files from `frontend/`.
- Re-run `npm run phase0-baseline` and compare latest snapshot.
- Record mismatch notes before changing code in later phases.

## 6) Freeze Record
Create a short freeze note in your release log including:
- Date/time of baseline.
- Commit hash.
- Paths to baseline snapshot files.
- Any known risks currently expected (for example, in-memory stores and email-scoped unauthenticated reads/writes).
