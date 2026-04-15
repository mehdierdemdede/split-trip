# Store Compliance Notes (SplitTrip)

This file is a working source for Google Play Data Safety and Apple App Privacy forms.

## Product Model
- Local-first mobile app.
- No account system.
- No app backend receiving trip content.
- User-initiated backup export/import only.

## Data Types (Current)
- User content: trip names, participant names, expense data, notes/categories, local audit history.

## Collection and Sharing (Current)
- Data collected by developer server: No.
- Data shared with third parties: No.
- Advertising: No.
- Analytics: No.
- Crash diagnostics: Yes, via Sentry only when `EXPO_PUBLIC_SENTRY_DSN` is configured for release.

## Security and Handling
- Data primarily stored in local SQLite database on device.
- Backup export uses user-initiated share flow.

## Google Play Data Safety (Current Expected Answers)
- Does the app collect or share any required user data types? No.
- Is all user data processed ephemerally? Not applicable.
- Is data encrypted in transit? Not applicable (no backend transfer by app).
- Can users request data deletion? Data deletion is user-controlled on device (delete trip/uninstall app).

## Apple App Privacy (Current Expected)
- Data Used to Track You: None.
- Data Linked to You: None.
- Data Not Linked to You: Diagnostics (if Sentry is enabled in release config).

## Required Store Assets/Links
- Privacy policy URL: host `PRIVACY_POLICY.md` content on a public URL (for example on medlabs.tech).
- Support URL: provide product support page/email.
- Marketing URL (optional): product page.

## Release Reminder
If analytics, crash reporting, authentication, cloud sync, or ads are added later, update:
1) This file
2) In-app Privacy screen
3) Google Play Data Safety
4) Apple App Privacy answers
