# SplitTrip Release QA Checklist

## 1) Pre-checks
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] App opens on both Android and iOS without crash.
- [ ] No blocking lints/errors in edited files.

## 2) Core User Flows
- [ ] Create a new trip with 2+ participants.
- [ ] Edit trip details (name/destination/dates).
- [ ] Add new participant to active trip.
- [ ] Add expense in base currency and verify balances.
- [ ] Add expense in foreign currency with amount in base.
- [ ] Edit expense and verify audit trail updates.
- [ ] Delete expense and verify removal + audit entry.

## 3) Split Logic Edge Cases
- [ ] Equal split with 2 participants.
- [ ] Equal split with 3+ participants and rounding looks correct.
- [ ] Custom split totals exactly match expense total.
- [ ] Custom split mismatch is blocked with clear error.
- [ ] Payer excluded from split is blocked with clear error.

## 4) Archive and Safety
- [ ] Archive trip from detail screen.
- [ ] Archived trip appears in Archive tab.
- [ ] Archived trip is read-only (no add/edit expense, no add participant).
- [ ] Unarchive restores trip to active list.
- [ ] Permanent delete confirms twice and removes trip data.

## 5) Backup and Restore
- [ ] Export trip backup JSON from trip backup screen.
- [ ] Import valid backup from file picker.
- [ ] Duplicate trip ID import is rejected with clear error.
- [ ] Invalid JSON import is rejected with clear error.
- [ ] Imported trip data (participants/expenses) matches source.

## 6) Summary and Sharing
- [ ] Trip summary total/balances/settlement render correctly.
- [ ] Share action opens native share sheet.
- [ ] Copy to clipboard action works.
- [ ] FX missing labels appear only where expected.

## 7) UX and Content
- [ ] User-facing text is English only.
- [ ] Empty/loading/error states are understandable.
- [ ] Buttons and navigation labels are consistent.
- [ ] Light and dark mode readability is acceptable.

## 8) Release Gate
- [ ] QA smoke done on at least one physical Android device.
- [ ] QA smoke done on at least one physical iOS device.
- [ ] Known issues list reviewed; no blocker remains.
- [ ] Ready for EAS preview build.
