# SplitTrip v1 Release Scope

Last updated: 2026-03-30

## Goal
Ship a stable, English-only MVP for Android and iOS focused on trip expense tracking, transparent splits, and fast settlement.

## In Scope (v1)
- Trip lifecycle
  - Create trip
  - Edit trip details
  - Archive/unarchive trip
  - Permanent delete with confirmation
- Participants
  - Add participant to active trip
- Expenses
  - Create, edit, delete expense
  - Equal split and custom split
  - Base-currency and foreign-currency handling (`amountInBase` support)
- Summary
  - Totals, balances, suggested settlement, recent expenses
  - Share and copy summary text
- Backup
  - Export trip JSON backup
  - Import valid backup JSON
  - Reject invalid/duplicate backup cases
- Privacy UX
  - In-app privacy screen aligned with current data model

## Out of Scope (Post-v1)
- Multi-language localization and in-app language picker
- Cloud sync / account system
- Collaboration or real-time multi-device sync
- Advanced analytics dashboard
- Web/desktop production release

## MVP Acceptance Criteria
- Functional
  - All in-scope flows pass manual QA checklist in `RELEASE_QA_CHECKLIST.md`.
  - Backup export/import round-trip works with data integrity preserved.
- Quality
  - `npm run typecheck` passes.
  - `npm test` passes.
  - No blocker defects in release candidate build.
- Content
  - User-facing strings are English.
  - Privacy statements are consistent between app and store docs.
- Release readiness
  - EAS profiles configured.
  - App identifiers and versioning configured.
  - Store compliance notes prepared.

## Release Blocking Issues
- Any crash on app launch or core flow.
- Data loss/corruption in trip, expense, or backup flows.
- Inability to build production binaries.
- Store compliance mismatch (privacy/data declarations vs behavior).
