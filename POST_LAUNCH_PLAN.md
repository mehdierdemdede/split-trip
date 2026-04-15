# Post-Launch Plan (Optional)

## 1) Localization Foundation
- Add locale detection (`expo-localization`).
- Add i18n layer and translation files.
- Keep English as fallback.
- Add optional in-app language override.

## 2) CI Automation
- Run typecheck and tests on pull requests.
- Add release workflow with guarded tags.
- Publish build artifacts and test reports.

## 3) UX Polish
- Improve empty/loading/skeleton states.
- Refine backup conflict messaging.
- Add first-run guidance for new users.

## 4) Product Insights
- Add minimal non-PII events only if needed.
- Keep privacy docs/store declarations in sync with any telemetry changes.
