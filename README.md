# Seclusa BP

A small, private blood pressure log. Runs entirely on this device: readings are
stored in the browser and nothing is ever sent anywhere. Works offline once it
has loaded.

## What it does

- Version 0.1.5
- Record a reading: systolic, diastolic, pulse (optional), when, and a short note.
- See the average across all recorded readings (systolic, diastolic, pulse).
- Delete individual readings, or clear everything.
- Export all readings to a JSON file, or import from one (merges, skipping duplicates).

## Usage

Open it, enter a reading, tap Add. To add it to your home screen, open your
browser's menu and choose "Add to Home Screen".

## HTTP Observatory

GitHub Pages cannot set framing / nosniff response headers, so Observatory grades this **B** — those −20/−5 knobs matter little here (no login, payments, or privileged actions; browsers already type JS/CSS correctly). What actually protects you is already in the pages: no third-party calls, `connect-src 'none'`, no unsafe inline/eval, local-only data. See [reports/http-observatory-2026-11-02.pdf](reports/http-observatory-2026-11-02.pdf).

## Files

- `index.html` — the app shell
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline-first)
- `static/` — styles, scripts, icons
- `reports/` — HTTP Observatory scan PDF
- `test/logic.test.mjs` — node --test tests for the pure logic

## Running the tests

    ./test.sh

## License

GPL-3.0. See [LICENSE](LICENSE).