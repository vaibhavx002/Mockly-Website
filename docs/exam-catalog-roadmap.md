# Exam Catalog and Backend Integration Roadmap

## Objective
Build a scalable exam catalog for SSC, RRB, UPSC, and Delhi Police while keeping All-Exams and Test-Series fully backend-driven.

## Phase 1: Canonical Catalog
- Create `backend/data/exams/catalog.json` as source of truth.
- Group exams by conducting body (`ssc`, `rrb`, `upsc`).
- Mark each exam as `isLive` or planned.
- Assign each exam a `dataFolder` and `paperConfig`.

## Phase 2: Data Family Layout
- Introduce exam-family directories:
- `backend/data/exams/cgl`
- `backend/data/exams/chsl`
- `backend/data/exams/ntpc`
- `backend/data/exams/csat`
- Move/copy live paper/question payloads to these folders.
- Keep legacy flat folders as fallback for safe migration.

## Phase 3: API Integration
- Load and merge exam registry from catalog at server boot.
- Expose grouped API endpoint: `GET /api/exam-catalog`.
- Enrich `GET /api/exams` with body grouping and live/planned counts.
- Resolve paper/question files from family folders first, then legacy fallback.

## Phase 4: Frontend Connection
- Keep All-Exams list backend-driven via `/api/exams`.
- Keep Test-Series backend-driven via `/api/test-series`.
- For planned exams, show non-launch CTA (`Coming Soon`) and avoid broken starts.

## Phase 5: Content Operations
- Use `backend/data/exams/_templates` for authoring.
- Standardize question quality:
- bilingual content (`content.en`, `content.hi`)
- explanations (`explanation.en`, `explanation.hi`)
- 4-option structure and valid answer index.

## Source Notes (Exam List Research)
- SSC official portal and exam list references: https://ssc.gov.in/
- RRB central board portal and recruitment categories: https://www.rrbcdg.gov.in/
- UPSC official portal and commonly listed exams: https://www.upsc.gov.in/
- Supplemental public exam listings were used to cross-check common names and aliases for catalog coverage.
