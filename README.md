# Seclusa BP

A small, private blood pressure log. Readings stay in the browser and are not
sent anywhere. Loading the app, and refreshing it while online, only fetches
this app's own files from the site you opened. After that it works offline.

## What it does

- Version 0.2.1
- Record a reading: systolic, diastolic, pulse (optional), when, and a short note.
- See the average across all recorded readings (systolic, diastolic, pulse).
- Delete individual readings, or clear everything.
- Share or save readings as JSON (optional encryption), or restore from a file (merges, skipping duplicates). 30-day backup reminder.
- Download a printable text or image copy of every reading from Backup.

## Usage

Open it, enter a reading, tap Add. To add it to your home screen, open your
browser's menu and choose "Add to Home Screen".

## HTTP Observatory

GitHub Pages cannot set framing / nosniff response headers, so Observatory grades this **B** — those −20/−5 knobs matter little here (no login, payments, or privileged actions; browsers already type JS/CSS correctly). What actually protects you is already in the pages: no third-party calls, `connect-src 'none'`, no unsafe inline/eval, local-only data. See [reports/http-observatory-2026-11-02.pdf](reports/http-observatory-2026-11-02.pdf).

## Files

- `index.html` — the app shell
- `offline.html` — fallback when a page is not cached yet
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline-first)
- `static/` — styles, scripts, icons
- `reports/` — HTTP Observatory scan PDF
- `test/logic.test.mjs` — node --test tests for the pure logic

## Running the tests

    ./test.sh

## License

GPL-3.0. See [LICENSE](LICENSE).