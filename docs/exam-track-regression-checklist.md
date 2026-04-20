# Exam Track Regression Checklist

Use this checklist after major changes in the "Choose Your Exam Track" and launch flow.

## Core UI
- Open `/` and confirm the section heading "Choose Your Exam Track" is visible.
- Confirm exam filters include: All, SSC, RRB, UPSC, Beginner Friendly, Advanced Level, Bilingual, Most Popular.
- Confirm exam cards are rendered and each has a Start action.
- Confirm the mock launch panel shows selected exam, duration, and level placeholders.

## Filter Behavior
- Click each stream filter (SSC, RRB, UPSC) and verify visible cards match stream.
- Click skill filters (Beginner/Advanced/Bilingual/Popular) and verify cards are filtered.
- If a filter yields no cards, verify empty state text appears: "No exams found for ...".
- Switch back to a valid filter and verify empty state disappears.

## Selection And Launch
- Click on an exam card body (not only button) and verify it selects and continues same flow.
- Click the Start button on the card and verify same behavior as full-card click.
- Verify selected card updates launch panel title, duration, and level.
- Click "Continue with Selected Exam" while logged out and verify auth modal opens.
- Complete auth and verify launch starts once (no duplicate tabs/windows).
- Let one launched mock reach 00:00 and verify the test auto-submits and answer editing is locked.
- After submit, verify score KPIs, section-wise breakdown, and per-question explanation table are visible.

## Assessment Modal
- Open "Take Quick Assessment" and answer all steps.
- On final step, verify button changes to loading state and controls are disabled while calculating.
- Verify recommendation view appears and "Use This Plan" sets the selected exam.
- Press `Esc` while modal is open and verify modal closes.

## Accessibility
- Navigate filter chips and card actions via keyboard (`Tab` / `Shift+Tab`).
- Verify visible focus ring appears on chips and exam action controls.
- Verify selected exam card has current-state accessibility attribute.

## Persistence And Routing
- Select an exam and refresh page; verify selected exam persists.
- Select a non-default filter and refresh page; verify filter persists.
- Use browser back/forward and verify filter + selected exam state restore correctly.

## API + Smoke
- Run `node .\\smoke-test.js`.
- Verify output flags are all true, including exam track shell, filters, source tracking, and focus styles.
- Verify `/mock/:examId` still loads the test window.
