# Data Folder

This folder contains the exam data contracts and payloads used by the backend APIs.

## Structure
- data/contracts: field-level contracts for exam, paper, and question records.
- data/papers: legacy flat paper metadata files (still supported).
- data/questions: legacy flat question bank files (still supported).
- data/exams: canonical grouped catalog and family-level data folders.

## Grouped Exam Data
- Canonical registry: data/exams/catalog.json
- Chapter registry: data/exams/chapterwise.json
- Family folders: data/exams/<family>/papers and data/exams/<family>/questions
- Authoring templates: data/exams/_templates

## Bilingual Authoring Standard
- `content.en.questionText` and `content.en.options` are required.
- `content.hi.questionText` and `content.hi.options` are recommended for bilingual families.
- `explanation.en` is required for quality explanations.
- `explanation.hi` is strongly recommended when Hindi is enabled.

## Runtime Resolution Order
When serving paper/question payloads, the backend loads in this order:
1. Exam-scoped path in data/exams/<family>/...
2. Legacy fallback in data/papers and data/questions

This allows safe migration from flat files to family-based folders without downtime.
