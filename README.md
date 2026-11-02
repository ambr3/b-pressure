# Seclusa BP

A small, private blood pressure log. Runs entirely on this device: readings are
stored in the browser and nothing is ever sent anywhere. Works offline once it
has loaded.

## What it does

- Version 0.1.4
- Record a reading: systolic, diastolic, pulse (optional), when, and a short note.
- See the average across all recorded readings (systolic, diastolic, pulse).
- Delete individual readings, or clear everything.
- Export all readings to a JSON file, or import from one (merges, skipping duplicates).

## Usage

Open it, enter a reading, tap Add. To add it to your home screen, open your
browser's menu and choose "Add to Home Screen".

## Files

- `index.html` — the app shell
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline-first)
- `static/` — styles, scripts, icons
- `test/logic.test.mjs` — node --test tests for the pure logic

## Running the tests

    ./test.sh

## License

GPL-3.0. See [LICENSE](LICENSE).