# User Dashboard Roadmap (Nav Login -> Full Dashboard)

Goal: when user clicks nav login/profile, show a complete dashboard with all critical user information and actions in one place.

## Current State Snapshot
1. Navbar already has `Log In` and `Sign Up` actions in `index.html`.
2. Frontend auth modal flow already exists in `script.js` with local session storage (`mockly_auth_session`).
3. When authenticated, nav login currently scrolls to test section instead of opening a dashboard.
4. Backend already has useful base APIs:
5. `GET /api/exams`
6. `GET /api/stats`
7. `GET /api/users/personalization?email=...`
8. `PUT /api/users/personalization`
9. There is no dedicated dashboard API and no attempt/history API yet.

## Product Outcome
1. Clicking nav login when unauthenticated should open login modal.
2. Clicking nav login when authenticated should open dashboard.
3. Dashboard should load all key information in one view:
4. Profile summary (name, email, current target exam).
5. Progress snapshot (last selected exam, launch count, recommendation count).
6. Exam shortcuts (quick start for each configured exam).
7. Recent mock activity and performance summary.
8. Personalization controls (target exam, study focus, language preferences).
9. Logout and account actions.

## Dashboard Information Architecture
1. Header Strip
2. User avatar, greeting, email, and last active time.
3. Quick actions: Start Mock, Continue Last Exam, Log Out.
4. Key Metrics Row
5. Total mocks launched.
6. Recommended exam confidence or current target.
7. Accuracy trend and attempted questions summary.
8. Main Grid
9. Left panel: Performance and recent attempts.
10. Right panel: Exam track cards and recommendations.
11. Bottom panel: Preferences and account settings.

## Functional Requirements
1. Auth-aware click behavior for nav login.
2. Dashboard opens as modal or dedicated route (`/dashboard`) based on selected implementation.
3. Safe loading state for every widget.
4. Empty-state copy for first-time users.
5. Error-state fallback when APIs fail.
6. All CTAs remain usable even if one widget fails.
7. Dashboard must be responsive on mobile and desktop.
8. Keyboard and screen-reader accessibility for dashboard open/close and section navigation.

## Technical Roadmap

## Phase 1: UX Contract + Skeleton (Frontend Only)
1. Add dashboard container markup in `frontend/index.html`.
2. Add dashboard styles in `frontend/style.css`.
3. Add open/close logic in `frontend/script.js`.
4. Change nav login click behavior:
5. Unauthenticated -> open auth modal.
6. Authenticated -> open dashboard.

Acceptance:
1. Authenticated user sees dashboard shell, not test-section scroll.
2. Dashboard opens/closes from keyboard and mouse.

## Phase 2: Data Adapter Layer (Frontend)
1. Create a single `loadDashboardData()` orchestrator in `frontend/script.js`.
2. Reuse existing APIs first:
3. `/api/users/personalization`
4. `/api/stats`
5. `/api/exams`
6. Hydrate widgets from these endpoints with loading/error/empty states.
7. Keep strict local fallback using stored user progress when API not available.

Acceptance:
1. Dashboard renders meaningful content with API on.
2. Dashboard still renders fallback content with API off.

## Phase 3: Backend Dashboard API (Recommended)
1. Add `GET /api/users/dashboard?email=...` in `backend/server.js`.
2. Return normalized payload for all dashboard widgets in one request:
3. user
4. profile
5. metrics
6. recentActivity
7. recommendedExams
8. Validate email and sanitize payload.
9. Keep backward compatibility with existing personalization endpoints.

Acceptance:
1. Frontend can fetch one endpoint and render full dashboard.
2. API returns stable shape with safe defaults.

## Phase 4: Attempts and Performance Tracking
1. Add attempt event write path when mock is submitted.
2. Add lightweight in-memory or file-backed attempt store for local environment.
3. Add `GET /api/users/attempts?email=...` with pagination.
4. Feed recent attempts and trends to dashboard charts/cards.

Acceptance:
1. After test submission, dashboard shows the new attempt.
2. Recent activity reflects latest exam and score.

## Phase 5: Personalization Controls in Dashboard
1. Add editable preferences panel:
2. Preferred exam track.
3. Preferred language.
4. Weekly target mocks.
5. Save through `PUT /api/users/personalization`.
6. Reflect updates immediately in dashboard and mock launch recommendations.

Acceptance:
1. Preference updates persist and survive page reload.
2. Launch CTA and recommendation blocks react to new preferences.

## Phase 6: Navigation and Routing Hardening
1. Decide final dashboard strategy:
2. Modal overlay in landing page.
3. Dedicated route (`/dashboard`) with deep-link support.
4. If route-based, implement guard redirect for unauthenticated users.
5. Support back/forward navigation without losing state.

Acceptance:
1. Browser navigation works predictably.
2. User always returns to last meaningful location.

## Phase 7: QA, Accessibility, and Regression
1. Manual QA matrix:
2. Unauthenticated login click.
3. Authenticated login click.
4. API success/failure paths.
5. First-time user empty state.
6. Existing mock launch flow remains intact.
7. Accessibility checks:
8. Focus trap in modal.
9. Escape close behavior.
10. ARIA labels for major controls.
11. Keyboard access for all CTAs.
12. Regression checks:
13. Existing auth modal still works.
14. Existing exam selection and launch still works.
15. Existing personalization sync still works.

Acceptance:
1. No regressions in mock flow, auth flow, or exam selection flow.
2. Dashboard is fully keyboard accessible.

## Suggested API Shape for Phase 3
```json
{
  "email": "user@example.com",
  "user": {
    "name": "Vaibhav",
    "avatarInitial": "V",
    "lastActiveAt": "2026-04-17T11:20:00.000Z"
  },
  "profile": {
    "lastSelectedExamId": "rrb-ntpc",
    "lastRecommendedExamId": "ssc-cgl",
    "preferences": {
      "preferredLanguage": "en",
      "weeklyMockTarget": 6
    }
  },
  "metrics": {
    "totalLaunches": 32,
    "totalRecommendations": 11,
    "last7DaysLaunches": 5,
    "avgScore": 71.4
  },
  "recentActivity": [
    {
      "attemptId": "att_001",
      "examId": "rrb-ntpc",
      "paperId": "rrb-ntpc-cbt1-2025-set1",
      "score": 14,
      "maxScore": 20,
      "submittedAt": "2026-04-17T10:45:00.000Z"
    }
  ],
  "recommendedExams": [
    {
      "examId": "ssc-cgl",
      "confidence": 82
    }
  ]
}
```

## File-Level Change Plan
1. `frontend/index.html`
2. Add dashboard overlay or route container.
3. Add nav account trigger hooks.
4. `frontend/style.css`
5. Add dashboard layout, cards, states, responsive styles.
6. `frontend/script.js`
7. Replace authenticated nav login click behavior.
8. Add dashboard open/close and render pipeline.
9. Add data fetch adapter and fallback mapping.
10. `backend/server.js`
11. Add `/api/users/dashboard` and optional `/api/users/attempts` endpoints.

## Milestone Plan
1. Milestone A (1 day): Phase 1 + Phase 2 basic dashboard.
2. Milestone B (1 day): Phase 3 consolidated dashboard API.
3. Milestone C (1-2 days): Phase 4 attempts and trends.
4. Milestone D (1 day): Phase 5 preferences controls.
5. Milestone E (0.5 day): Phase 6 and Phase 7 hardening.

## Definition of Done
1. Authenticated nav login reliably opens dashboard.
2. Dashboard shows profile, progress, exam shortcuts, and activity in one place.
3. Dashboard remains usable with API failures (fallback states).
4. Existing launch and auth flows remain regression-safe.
5. Dashboard is responsive and accessible.
