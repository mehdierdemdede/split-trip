# Release Error Triage

## Severity Levels
- `P0` App launch crash, data loss/corruption, impossible to submit/install.
- `P1` Core flow broken (create/edit trip/expense, backup import/export, summary unusable).
- `P2` UX defect with workaround, non-critical regression.
- `P3` Cosmetic/low impact.

## Triage Workflow
1. Reproduce on latest candidate build.
2. Label severity (`P0`..`P3`).
3. Decide action:
   - `P0/P1`: fix before release.
   - `P2`: fix if low risk, otherwise defer.
   - `P3`: defer.
4. Retest on same build type (preview/prod candidate).
5. Record resolution note.

## Sentry (Crash Diagnostics)
- Runtime DSN key: `EXPO_PUBLIC_SENTRY_DSN`
- Monitoring init file: `lib/monitoring.ts`
- Entry point hookup: `app/_layout.tsx`

## Minimum Release Gate
- Zero `P0`.
- Zero unresolved `P1`.
- Known `P2/P3` explicitly accepted.
