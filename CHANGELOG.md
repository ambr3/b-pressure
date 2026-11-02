# Changelog

## [0.1.5] - 2026-11-02

- CSP tightened to `default-src 'none'` (explicit allowlists for what the app loads).
- HTTP Observatory B on GitHub Pages accepted and documented: missing framing/nosniff headers are host limits, not app gaps for this local-only PWA.
- Published the Observatory scan PDF under `reports/`.

## [0.1.4] - 2026-11-02

- Service worker cache prefix is app-specific (`seclusa-bp-`) so it no longer collides with other Seclusa apps on the same origin.
- Navigations are truly network-first again: a fresh 200 is returned, not the stale cached shell.
- Import and storage reject diastolic ≥ systolic, matching the form validator.
- Permissions-Policy intent meta restored to match the shared template.
- Theme / CSP aligned with `shared/templates/seclusa-app`.

## [0.1.3] - 2026-10-27

- Readings dated more than a day ahead are rejected on save and import. Stored readings are no longer hidden or removed when read.
- Import is refused, with a message, if it would go over the 5000-reading limit, instead of silently dropping older readings.
- Removed unused `Store.getData`/`setData` and `Theme.prefersDark`, and the ignored Permissions-Policy meta tag.
- Version label fixed. Service worker cache bumped so returning visitors get the new files.

## [0.1.2] - 2026-10-26

- Manifest: stable `id`, `lang`, `categories`.
- Service worker: install refuses an incomplete precache instead of activating an empty offline shell.
- Service worker registered with `updateViaCache: "none"` so update checks always reach the network.

## [0.1.1] - 2026-10-25

- Bump cache version; SRI and header hardening for A+.

## [0.1.0] - 2026-10-25

- Initial release: log blood pressure readings, view average, export/import backup.