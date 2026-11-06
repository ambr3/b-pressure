# Changelog

## [0.1.11] - 2026-11-06

- Readings must be whole numbers. An empty field is not treated as zero.
- Import keeps a different reading that reused an id. Stored duplicate ids are repaired.
- A full storage quota no longer reports the reading as saved.
- Clear all removes readings and the backup reminder, and leaves the shared theme alone.
- Encrypted backups reject an oversized password, salt, or key-derivation setting.
- The confirmation toast sits above the bottom nav.

## [0.1.10] - 2026-11-03

- Theme nav label is always **Theme**.
- Orange ruled lines faded further.
- About links point at the GitHub repo (`ambr3/b-pressure`).
- Offline page SRI for `seclusa-base.css` matched the current file.

## [0.1.9] - 2026-11-03

- Bottom nav matches Notes/Calendar: Theme · Backup · About sheets.
- Theme sheet with mode chips and background swatches (including custom hex).
- Fixed backup: `SeclusaBackup` is exposed on `window` so share/save work.

## [0.1.8] - 2026-11-03

- Orange ruled-lines theme shows full-page again (opaque body background was covering it).
- Synced `seclusa-base.css` from shared theme.

## [0.1.7] - 2026-11-03

- Separate Share and Save / Download backup actions.
- Optional encrypted backups (AES-GCM, same container as Notes / Calendar).
- Last-backup label and a soft reminder after 30 days.
- SRI hash for `seclusa-base.css` corrected to match the file on disk.

## [0.1.6] - 2026-11-02

- Service worker: network-first for assets (not only navigations) so a deploy cannot pair new SRI hashes with stale cached JS/CSS.
- `cacheable()` accepts `?v=` correctly (`URL.search` includes `?`); shell CSS/JS load with `?v=0.1.6` and are precached under that key.
- Import fills remaining room up to 5000 readings instead of refusing the whole file.
- Duplicate reading ids are reminted on add/set so delete cannot wipe multiple rows.
- Tests cover import-at-cap, future import rejection, id uniqueness, and SW `cacheable()`.

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
