# Release Checklist

Use this checklist before shipping changes.

## 1) Environment
- Use Node 18+.
- Install dependencies with `npm install`.
- Start server with `npm start`.

## 2) Phase 0 Baseline Freeze
- Run `npm run phase0-baseline`.
- Confirm baseline output files are generated under `backend/baseline/`.
- Confirm `backend/baseline/phase0-baseline-latest.json` reflects current behavior before hardening.

## 3) Automated Validation
- Run `npm run smoke-test`.
- Run `npm run validate-questions`.
- Confirm all smoke output flags are true.
- Confirm both commands exit with code 0.

## 4) Exam Track UI
- Open `/` and verify the section "Choose Your Exam Track" appears.
- Verify filters include All, SSC, RRB, UPSC, Beginner Friendly, Advanced Level, Bilingual, Most Popular.
- Verify card selection updates selected exam, duration, and level in launch panel.
- Verify empty-filter message appears when no cards match and disappears when matches return.

## 5) Launch Flow
- Verify full-card click and card button click both work.
- Verify unauthenticated flow opens auth modal.
- Verify authenticated flow launches test only once.
- Verify no duplicate tab/window opens in launch.

## 6) Assessment
- Verify all 4 assessment steps are answerable.
- Verify loading state appears on final calculation.
- Verify controls are disabled while calculating.
- Verify "Use This Plan" selects and scrolls to launch panel.
- Verify Escape key closes assessment modal.

## 7) Accessibility
- Verify keyboard focus ring appears on chips and exam actions.
- Verify selected exam card exposes current-state accessibility attribute.

## 8) Dynamic Trust Strip
- Verify `/api/stats` returns aspirants, selections, and rating.
- Verify trust strip values update from API response on page load.
- Verify defaults remain visible if stats API is unavailable.

## 9) Data Handoff (Cards And Questions)
- Keep exam metadata shape consistent with `/api/exams` contract:
  - `id`, `stream`, `title`, `description`, `iconClass`, `tags`, `recommendedDuration`, `recommendedLevel`.
- Keep question data updates isolated to test-window question bank logic.
- Re-run smoke test after any card or question data change.

## 10) Final Quick Pass
- Hard refresh browser (`Ctrl+F5`).
- Recheck one SSC and one RRB path end-to-end.
- Confirm no editor errors in `index.html`, `script.js`, `style.css`, `server.js`.
