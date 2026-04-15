# Device + Beta Runbook

## Objective
Complete the release gate: physical-device smoke test + Android Internal Testing + iOS TestFlight verification.

## Execution Log
- 2026-03-30: Android preview build completed.
  - Build ID: `3af87707-0b3f-4e2e-9fc7-99836a587e3d`
  - Artifact: `https://expo.dev/artifacts/eas/8hmrh3th7YVG45xE8yVeda.apk`
- Pending: iOS preview build credential setup (interactive Apple credentials required once).
- Pending: physical-device smoke execution and sign-off entries.

## A) Physical Device Smoke (Both Platforms)
- [ ] Install latest preview build on one Android phone.
- [ ] Install latest preview build on one iPhone.
- [ ] Validate flows from `RELEASE_QA_CHECKLIST.md`.
- [ ] Capture failures with repro steps and screenshots.

## B) Android Internal Testing (Play Console)
1. Build:
   - `npm run build:preview:android`
2. Submit or upload AAB to Internal testing track.
3. Add internal testers (emails/group).
4. Verify install from Play Internal testing link.
5. Execute smoke tests on production-like install.

Exit criteria:
- [ ] No blocker crash.
- [ ] No data-loss bug.
- [ ] No store-install issue.

## C) iOS TestFlight
1. Build:
   - `npm run build:preview:ios`
2. Submit IPA to TestFlight.
3. Add internal testers.
4. Run smoke tests on TestFlight build.

Exit criteria:
- [ ] Build processes and installs.
- [ ] Core trip/expense/backup flows pass.
- [ ] No blocker crash.

## D) Sign-off Template
- Build ID:
- Platform:
- Tester:
- Date:
- Result: pass/fail
- Notes:
