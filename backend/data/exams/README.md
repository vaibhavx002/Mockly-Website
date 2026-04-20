# Exam Family Data Layout

This folder is the source of truth for scalable exam onboarding.

## Why this exists
- Keep every exam family isolated (for example `cgl`, `chsl`, `ntpc`, `csat`).
- Allow adding bilingual questions (`en` and `hi`) with explanations.
- Let API loaders resolve exam-specific files first and then fall back to legacy files.

## Folder pattern
- `backend/data/exams/catalog.json`: canonical exam registry used by backend APIs.
- `backend/data/exams/chapterwise.json`: subject/chapter/topic map for all exams.
- `backend/data/exams/<family>/papers/*.json`: paper metadata.
- `backend/data/exams/<family>/questions/*.json`: question bank payload.
- `backend/data/exams/<family>/topics.json`: optional per-exam paper-wise topic mapping.
- `backend/data/exams/_templates`: authoring templates.

## Authoring checklist
1. Add exam entry in `catalog.json` with `id`, `bodyId`, `stream`, `dataFolder`, `paperConfig`.
2. Add paper metadata in `<family>/papers/<paperId>.json`.
3. Add question file in `<family>/questions/<paperId>.json`.
4. Optionally define topic mappings in `<family>/topics.json` using paper-level `byQuestionId`, `byQuestionNumber`, `ranges`, and `bySection`.
5. For full mock papers, you can also add `topicMappings` directly inside `<family>/papers/<paperId>.json` (same structure) or set section-level taxonomy fields in each section object.
6. Ensure each question has:
- `content.en.questionText` and 4 options.
- `content.hi.questionText` and 4 options (recommended for bilingual families).
- `explanation.en` (required for quality).
- `explanation.hi` (recommended if Hindi is enabled).
- Optional media: `media.questionImageUrl`, `media.optionImageUrls`, and `media.explanationImageUrl`.
7. Run validators and smoke tests.

## Current live families
- `cgl`
- `chsl`
- `ntpc`
- `group-d`
- `csat`
