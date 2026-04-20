# Question Injection Roadmap (Free Mock Section)

Goal: add real, scalable question injection to Free Mock tests with bilingual content (English + Hindi) and optional image support.

## Read-First: Current Reality
1. Free Mock launcher UI is present in index page and works.
2. Launch API exists and returns startUrl for mock route.
3. Mock route currently serves a legacy hardcoded page (mocked-test.html).
4. A newer test UI exists (mock-test.html + mock-test.js), but questions are still hardcoded in JavaScript templates.
5. Question contract currently supports text-only question/options and a single language field.

This roadmap fixes all of the above in implementation order.

## Quick Answer: How To Add Questions Today
Today you have two temporary paths:
1. Legacy path currently used by route: edit question arrays in mocked-test.html.
2. Newer path (if route is switched): edit questionTemplatesByExam in mock-test.js.

Both are temporary and not scalable. The complete roadmap below moves questions into JSON files and API payloads.

## Scope
1. Dynamic loading by examId + paperId.
2. Bilingual question content per question.
3. Optional image for question and options.
4. Validation pipeline to prevent broken data.
5. Regression-safe rollout across all exam cards.

## Data Model v2 (Required vs Optional)

### Required fields
1. questionId
2. examId
3. paperId
4. sectionId
5. content.en.questionText
6. content.en.options (array length 4)
7. correctOptionIndex (0..3)

### Optional fields
1. content.hi.questionText
2. content.hi.options (array length 4)
3. media.questionImageUrl
4. media.optionImageUrls (array length 4, can contain null)
5. difficulty
6. sourceYear
7. tags

### Recommended JSON shape
```json
{
  "questionId": "rrbgd-2025-s1-q001",
  "examId": "rrb-group-d",
  "paperId": "rrb-group-d-cbt-2025-set1",
  "sectionId": "math",
  "content": {
   "en": {
    "questionText": "What is 25 + 37?",
    "options": ["60", "61", "62", "63"]
   },
   "hi": {
    "questionText": "25 + 37 kitna hai?",
    "options": ["60", "61", "62", "63"]
   }
  },
  "media": {
   "questionImageUrl": null,
   "optionImageUrls": [null, null, null, null]
  },
  "correctOptionIndex": 2,
  "difficulty": "easy",
  "sourceYear": "2025"
}
```

Notes:
1. Image fields are optional. If absent or null, render text only.
2. Hindi block can be optional in early rollout; fallback to English when Hindi is missing.

## Complete Implementation Roadmap

## Phase 0: Route And UI Consolidation (Mandatory First)
1. Decide one test window implementation as source of truth.
2. Recommended: use mock-test.html + mock-test.js as primary test window.
3. Update /mock/:examId route to serve mock-test.html (not mocked-test.html).
4. Keep mocked-test.html only as backup until rollout stabilizes.

Acceptance criteria:
1. Launching any exam opens the same maintained test UI.

## Phase 1: Contracts Upgrade
1. Update question contract to include content and media objects.
2. Keep backward compatibility for old questionText/options for one release window (optional but recommended).
3. Update paper metadata contract only if needed (no image-specific change required there).

Acceptance criteria:
1. Contract clearly marks which fields are required and which are optional.
2. Contract documents bilingual fallback behavior.

## Phase 2: Data Storage Convention
1. Keep paper files in backend/data/papers.
2. Keep question files in backend/data/questions.
3. Add image asset folder convention:
  - backend/data/assets/<examId>/<paperId>/questions/
4. Use relative URLs that static server can serve, for example:
  - /assets/rrb-group-d/rrb-group-d-cbt-2025-set1/questions/q001.png

Acceptance criteria:
1. One paper has at least 1 image-based sample question and 1 text-only sample question.

## Phase 3: Backend APIs
1. Add GET /api/papers/:examId
  - returns all paper metadata for exam.
2. Add GET /api/questions/:examId/:paperId?lang=en|hi
  - returns normalized question payload.
3. Update POST /api/mocks/launch
  - accept optional paperId
  - return paperId in response
  - generate startUrl with paperId and session.
4. Optional admin upload endpoint for media:
  - POST /api/admin/media/upload

Validation rules:
1. examId must exist.
2. paperId must belong to exam.
3. section counts must match actual question count.
4. options length must be 4.
5. correctOptionIndex in range 0..3.

Acceptance criteria:
1. API returns clear 4xx errors for malformed data.
2. Launch response always includes examId, paperId, startUrl, token.

## Phase 4: Frontend Loader Refactor
1. In launch flow, send selected/default paperId.
2. Build URL format:
  - /mock/:examId?paperId=<paperId>&session=<token>
3. In mock-test.js:
  - remove hardcoded buildQuestionBank path
  - fetch metadata + questions from API
  - use API duration for timer
  - use API sections for section labels/counts.

Acceptance criteria:
1. No hardcoded exam question templates in runtime path.
2. Reloading page with same examId+paperId reproduces exact paper.

## Phase 5: Bilingual UI Behavior
1. Wire language selector in test toolbar.
2. Keep selected language state in memory.
3. Render content[lang] when available.
4. Fallback logic:
  - If Hindi missing, show English and a non-blocking notice.

Acceptance criteria:
1. Switching language updates current question and options immediately.
2. Question index and selected answer remain unchanged after language switch.

## Phase 6: Optional Image Rendering
1. Add question image slot in question panel.
2. Add option image slot in each option row.
3. Render only when URL exists.
4. Add placeholder skeleton while image loads.
5. Add broken-image fallback UI (text remains readable).

Acceptance criteria:
1. Text-only questions render with no layout break.
2. Image questions render responsively on desktop and mobile.

## Phase 7: Content Ops Workflow (Question Add/Update)
1. Author question in JSON using contract.
2. (Optional) upload image and paste returned URL.
3. Run validation script before commit.
4. Run smoke test for launch and render.
5. Merge only after checklist pass.

Suggested scripts:
1. npm run validate-questions
2. npm run smoke-test

Acceptance criteria:
1. Adding a new question set requires only data file + optional images, not JS edits.

## Phase 8: QA And Regression
Automated checks:
1. Contract validation for all question files.
2. Section totals vs metadata totals.
3. API launch and API questions route smoke tests.

Manual checks:
1. Free mock selection from all exam cards.
2. English/Hindi toggle behavior.
3. Question image and option image behavior.
4. Timer, palette, save-next, mark-review, submit summary.

Acceptance criteria:
1. No hardcoded question fallback used in production path.
2. No launch flow break for authenticated and guest states.

## Delivery Plan (Practical Timeline)
1. Day 1: Phase 0 + Phase 1.
2. Day 2: Phase 2 + Phase 3 endpoints.
3. Day 3: Phase 4 frontend integration.
4. Day 4: Phase 5 bilingual + Phase 6 image rendering.
5. Day 5: Phase 7 tooling + Phase 8 regression.

## Definition Of Done
1. Free mock starts with examId + paperId and loads real questions from API.
2. English/Hindi toggle works on same question without losing state.
3. Image fields are optional and safely handled when absent.
4. New questions can be added via JSON without touching UI JavaScript.
