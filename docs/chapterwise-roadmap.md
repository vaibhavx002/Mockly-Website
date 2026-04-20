# Chapterwise Roadmap (After Catalog Foundation)

## Phase A: Subject Registry
- Define subject map per exam in `backend/data/exams/<family>/subjects.json`.
- Every subject gets a stable `subjectId`, label, and priority weight.

## Phase B: Chapter Registry
- Create `backend/data/exams/<family>/chapters.json`.
- Each chapter row includes:
- `chapterId`, `subjectId`, `name`, `difficultyBand`, `expectedWeightage`.

## Phase C: Topic Granularity
- Add `backend/data/exams/<family>/topics.json` for micro-skills.
- Each topic maps to one chapter and one or more concept tags.

## Phase D: Question Tagging Upgrade
- Add `subjectId`, `chapterId`, and `topicIds` to each question record.
- Continue bilingual shape in `content.en` and `content.hi`.
- Keep `explanation.en` mandatory and `explanation.hi` strongly recommended.

## Phase E: API and UI Integration
- Add filters in backend endpoints for subject/chapter/topic.
- Extend `/api/test-series` for chapter-targeted recommendations.
- Add chapter chips and weak-chapter analytics in Test-Series UI.

## Phase F: Adaptive Learning Loop
- Save chapter-level weak areas from attempt analytics.
- Prioritize next mock suggestions using low-accuracy chapters.
- Track chapter mastery trend over rolling 7 and 30 day windows.

## Definition of Done
- New exam onboarding includes subject/chapter/topic files.
- Candidate can start a chapter-specific mock from Test-Series.
- Dashboard shows chapter strengths, weak zones, and revision queue.
