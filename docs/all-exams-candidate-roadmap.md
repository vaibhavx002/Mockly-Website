# All Exams Candidate-First Roadmap

Goal: redesign the All Exams experience so a candidate can answer three questions in under 60 seconds.
1. Which exam should I focus on now?
2. Can I trust this mock to match the real exam pattern?
3. What is the fastest next action for today?

## Why The Current Experience Feels Weak
1. Catalog browsing is clean but mostly static and generic.
2. Cards do not show decision-critical details like pattern fit, syllabus coverage, or freshness.
3. There is no candidate stage guidance (new, switching exam, revision mode, final push).
4. There is no confidence framework (readiness signal, weak areas, recommended first mock).
5. CTA language is action-focused but not context-aware (no resume, no study plan continuity).

## Candidate Thinking Model (Jobs To Be Done)
1. I want to shortlist the right exam quickly without opening many pages.
2. I want to know if this mock is realistic for my upcoming exam attempt.
3. I want to start from my current level, not from zero every time.
4. I want to compare tracks when I am confused between two exams.
5. I want clear next steps after each mock, not just a launch button.

## Product Outcome
1. Candidate can discover, compare, and launch an exam flow in one page.
2. Candidate gets a personalized recommendation with reason codes.
3. Candidate gets continuity: resume, revision, and next best mock.
4. Candidate trust increases through transparent exam metadata and freshness indicators.

## Information Architecture (Candidate-First)
1. Top strip: quick status with target exam, last activity, and resume CTA.
2. Recommendation rail: best next exam plus reason chips.
3. Discovery controls: search, stream, level, language, attempt type, and sort.
4. Comparison mode: select up to three exams and compare pattern fields side by side.
5. Exam cards: enriched decision data, trust labels, and smart CTAs.
6. Support rail: first-time guide, exam planning tips, and FAQ shortcuts.

## Must-Have Card Fields
1. Exam name and stream.
2. Latest paper pattern label and last updated date.
3. Questions count, marking style, and duration.
4. Section mix and difficulty profile.
5. Bilingual support status.
6. Candidate fit score and recommended stage.
7. Three CTAs: Start, Resume, and View Plan.

## Personalization Logic (Phase-Wise)
1. Phase 1: basic personalization from local session and last selected exam.
2. Phase 2: API-based recommendation using recent attempts and preferences.
3. Phase 3: confidence engine with weak-topic signals and streak-aware planning.

## UX Copy Principles
1. Replace feature copy with decision copy.
2. Use plain language for pressure moments.
3. Always show one clear next action.
4. Keep trust signals factual and timestamped.

## Feature Roadmap

## Phase 0: Baseline And Metrics
1. Add event tracking for search usage, filter usage, compare usage, launch, and resume.
2. Define success metrics for candidate decision speed and launch conversion.
3. Capture baseline before UI changes.

Acceptance:
1. Dashboard can report page-level funnels for All Exams interactions.

## Phase 1: Decision-Ready Catalog
1. Upgrade card schema in catalog payload to include pattern details and freshness metadata.
2. Add sorting by popularity, readiness fit, and newest updates.
3. Add filter set for level, language, and exam urgency.
4. Improve status line to explain why results changed.

Acceptance:
1. Candidate can reach a filtered shortlist in three interactions or fewer.
2. Every card has enough data to decide without opening another page.

## Phase 2: Smart CTAs And Continuity
1. Add Resume CTA when incomplete session exists.
2. Add View Plan CTA that opens exam-specific plan summary.
3. Add guardrails for first-time users with beginner route suggestions.
4. Keep launch behavior compatible with current mock routing.

Acceptance:
1. Returning candidates see Resume as primary action.
2. New candidates get a guided first mock recommendation.

## Phase 3: Compare Mode
1. Add compare toggle and multi-select on cards.
2. Render side-by-side table for up to three exams.
3. Include pattern fields, duration, level, language, and recommended candidate type.
4. Add quick action from comparison panel to start selected exam.

Acceptance:
1. Candidate can compare two exams and launch one without leaving page.

## Phase 4: Recommendation Rail
1. Add top recommendation section driven by user data.
2. Show reason chips such as Weak in Quant, High completion probability, or Exam in 30 days.
3. Add confidence range and expected effort estimate.
4. Add dismiss and feedback controls for recommendation quality.

Acceptance:
1. Recommendation click-through improves against baseline.
2. Candidate can see why an exam is recommended.

## Phase 5: Trust And Reliability
1. Add metadata chips: Last updated, Pattern verified, and Source year.
2. Surface data fallback state without breaking CTAs when API is down.
3. Add stale-data warning if exam metadata exceeds freshness threshold.
4. Add accessibility pass for keyboard navigation and screen reader labels.

Acceptance:
1. API failure does not block launch path.
2. Accessibility checks pass for controls, filters, compare mode, and CTA actions.

## Suggested API Contract Extensions
1. Extend GET /api/exams payload with:
2. pattern
3. sections
4. marksScheme
5. totalQuestions
6. lastUpdatedAt
7. fitSignals
8. freshness
9. Add optional GET /api/exams/recommendation?email=... for reasoned recommendation block.
10. Extend GET /api/users/dashboard with all-exams summary widget data.

## File-Level Implementation Plan
1. Update [frontend/all-exams.html](frontend/all-exams.html) structure for recommendation rail, compare drawer, and richer card template.
2. Extract inline CSS/JS from [frontend/all-exams.html](frontend/all-exams.html) into [frontend/style.css](frontend/style.css) and [frontend/script.js](frontend/script.js) sections or a dedicated module to reduce page complexity.
3. Add rendering and state orchestration in [frontend/script.js](frontend/script.js) for filters, sort, compare, and recommendation logic.
4. Add or extend APIs in [backend/server.js](backend/server.js) for richer exam metadata and recommendation reasons.
5. Add response validation updates in [backend/data-validate.js](backend/data-validate.js) for new contract fields.

## QA Plan
1. New candidate flow: first visit, no history, guided start.
2. Returning candidate flow: has incomplete mock, resume path.
3. Switching exam flow: compare mode and sort by fit.
4. API unavailable flow: fallback catalog still launchable.
5. Accessibility flow: full keyboard interaction and ARIA narration.

## Milestones
1. Milestone A (1 day): Phase 0 and Phase 1.
2. Milestone B (1 day): Phase 2 and compare scaffolding.
3. Milestone C (1 day): Phase 3 complete compare mode.
4. Milestone D (1 day): Phase 4 recommendation rail.
5. Milestone E (0.5 day): Phase 5 reliability and accessibility hardening.

## Definition Of Done
1. Candidate can decide, compare, and launch in one page.
2. Page supports resume and personalized recommendation.
3. Trust metadata is visible and up to date.
4. Experience remains functional when APIs partially fail.
5. Accessibility and responsive behavior are regression-safe.