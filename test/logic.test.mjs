/* Tests for the pure logic in the app.
   No dependencies, no framework: run with `node --test test/`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, "..", "static", "js");

function load(file, extra = {}) {
  const source = readFileSync(join(jsDir, file), "utf8");
  const win = { ...extra };
  new Function("window", source)(win);
  return win;
}

/* ------------------------------------------------------------------ bp */
const { BP } = load("bp.js");

test("validate accepts a sane reading", () => {
  const r = BP.validate({ systolic: 120, diastolic: 80, pulse: 70 });
  assert.equal(r.ok, true);
  assert.equal(r.systolic, 120);
  assert.equal(r.diastolic, 80);
  assert.equal(r.pulse, 70);
});

test("validate rejects missing or out-of-range values", () => {
  assert.equal(BP.validate({ systolic: 10, diastolic: 80 }).ok, false);
  assert.equal(BP.validate({ systolic: 120, diastolic: 80, pulse: 10 }).ok, false);
  assert.equal(BP.validate({ systolic: 120 }).ok, false);
});

test("validate rejects diastolic >= systolic", () => {
  assert.equal(BP.validate({ systolic: 120, diastolic: 120 }).ok, false);
  assert.equal(BP.validate({ systolic: 120, diastolic: 130 }).ok, false);
});

test("validate rejects empty strings and fractional mmHg", () => {
  assert.equal(BP.validate({ systolic: "", diastolic: 80 }).ok, false);
  assert.equal(BP.validate({ systolic: "120.4", diastolic: 80 }).ok, false);
  assert.equal(BP.validate({ systolic: 120, diastolic: 80, pulse: 70.5 }).ok, false);
  const ok = BP.validate({ systolic: " 120 ", diastolic: "80", pulse: "" });
  assert.equal(ok.ok, true);
  assert.equal(ok.systolic, 120);
  assert.equal(ok.pulse, null);
});

test("validate allows missing pulse", () => {
  const r = BP.validate({ systolic: 120, diastolic: 80, pulse: "" });
  assert.equal(r.ok, true);
  assert.equal(r.pulse, null);
});

test("average returns null for empty", () => {
  assert.equal(BP.average([]), null);
  assert.equal(BP.average(null), null);
});

test("average computes systolic/diastolic/pulse", () => {
  const readings = [
    { systolic: 120, diastolic: 80, pulse: 70, ts: 1 },
    { systolic: 130, diastolic: 85, pulse: 72, ts: 2 }
  ];
  const a = BP.average(readings);
  assert.equal(a.count, 2);
  assert.equal(a.systolic, 125);
  assert.equal(a.diastolic, 82.5);
  assert.equal(a.pulse, 71);
  assert.equal(a.pulseCount, 2);
});

test("average handles mixed pulse", () => {
  const readings = [
    { systolic: 120, diastolic: 80, pulse: 70, ts: 1 },
    { systolic: 130, diastolic: 85, pulse: null, ts: 2 }
  ];
  const a = BP.average(readings);
  assert.equal(a.pulse, 70);
  assert.equal(a.pulseCount, 1);
});

test("sortNewest orders by ts descending", () => {
  const out = BP.sortNewest([{ ts: 1 }, { ts: 3 }, { ts: 2 }]);
  assert.deepEqual(out.map((r) => r.ts), [3, 2, 1]);
});

test("toLocalInput / fromLocalInput round trip", () => {
  const ts = new Date(2025, 0, 15, 9, 30).getTime();
  const s = BP.toLocalInput(ts);
  assert.equal(BP.fromLocalInput(s), ts);
});

/* ----------------------------------------------------------------- store */
function makeStorage(throwOnAccess) {
  const map = new Map();
  return {
    getItem(k) {
      if (throwOnAccess) throw new Error("blocked");
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnAccess) throw new Error("blocked");
      map.set(k, String(v));
    },
    removeItem(k) {
      if (throwOnAccess) throw new Error("blocked");
      map.delete(k);
    }
  };
}

function loadStore(storage) {
  const win = { localStorage: storage };
  const source = readFileSync(join(jsDir, "store.js"), "utf8");
  new Function("window", source)(win);
  return win.Store;
}

test("readings are added and listed newest first", () => {
  const Store = loadStore(makeStorage(false));
  const r = Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  assert.equal(r.added, true);
  Store.addReading({ systolic: 130, diastolic: 85, ts: 20 });
  const list = Store.getReadings();
  assert.equal(list.length, 2);
  assert.equal(list[0].systolic, 130);
});

test("invalid reading is not stored", () => {
  const Store = loadStore(makeStorage(false));
  const r = Store.addReading({ systolic: 10, diastolic: 80 });
  assert.equal(r.added, false);
  assert.equal(Store.getReadings().length, 0);
});

test("diastolic >= systolic is not stored", () => {
  const Store = loadStore(makeStorage(false));
  assert.equal(Store.addReading({ systolic: 120, diastolic: 120, ts: 10 }).added, false);
  assert.equal(Store.addReading({ systolic: 120, diastolic: 130, ts: 10 }).added, false);
  assert.equal(Store.getReadings().length, 0);
});

test("duplicate reading is not stored twice", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  const r = Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  assert.equal(r.added, false);
  assert.equal(r.duplicate, true);
  assert.equal(Store.getReadings().length, 1);
});

test("removeReading deletes by id", () => {
  const Store = loadStore(makeStorage(false));
  const r = Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  assert.equal(Store.removeReading(r.reading.id), true);
  assert.equal(Store.getReadings().length, 0);
  assert.equal(Store.removeReading("nope"), false);
});

test("clearAll removes readings", () => {
  const storage = makeStorage(false);
  const Store = loadStore(storage);
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  Store.clearAll();
  assert.equal(storage.getItem("bp.readings"), null);
  assert.equal(Store.getReadings().length, 0);
});

test("blocked storage does not break the app", () => {
  const Store = loadStore(makeStorage(true));
  const r = Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  assert.equal(r.added, true);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.isPersistent(), false);
});

test("corrupt stored data is dropped", () => {
  const storage = makeStorage(false);
  storage.setItem("bp.readings", "{not json");
  const Store = loadStore(storage);
  assert.deepEqual(Store.getReadings(), []);
});

test("clearAll removes readings but keeps the shared theme", () => {
  const storage = makeStorage(false);
  const Store = loadStore(storage);
  Store.setTheme("dark");
  storage.setItem("ssc.pref_key_bg", "blue");
  storage.setItem("ssc.pref_key_bg_custom", "#112233");
  storage.setItem("privacy_calendar_theme", "dark");
  storage.setItem("seclusa-bp-last-backup", "1");
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  Store.clearAll();
  assert.equal(storage.getItem("ssc.pref_key_night_mode"), "dark");
  assert.equal(storage.getItem("ssc.pref_key_bg"), "blue");
  assert.equal(storage.getItem("ssc.pref_key_bg_custom"), "#112233");
  assert.equal(storage.getItem("privacy_calendar_theme"), "dark");
  assert.equal(storage.getItem("seclusa-bp-last-backup"), null);
  assert.equal(storage.getItem("bp.readings"), null);
  assert.equal(storage.getItem("bp.settings"), null);
  assert.equal(Store.getReadings().length, 0);
  assert.equal(Store.getTheme(), "dark");
});

test("note is cleaned", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10, note: "line1\nline2" });
  assert.equal(Store.getReadings()[0].note, "line1 line2");
});

test("exportReadings returns a copy", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  const out = Store.exportReadings();
  assert.equal(out.length, 1);
  out.pop();
  assert.equal(Store.getReadings().length, 1);
});

test("importReadings keeps a different reading that reused an id", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ id: "same", systolic: 120, diastolic: 80, ts: 10 });
  const res = Store.importReadings([
    { id: "same", systolic: 130, diastolic: 85, ts: 20 }
  ]);
  assert.equal(res.added, 1);
  assert.equal(res.skipped, 0);
  const list = Store.getReadings();
  assert.equal(list.length, 2);
  assert.equal(new Set(list.map((r) => r.id)).size, 2);
  assert.equal(Store.removeReading("same"), true);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.getReadings()[0].systolic, 130);
});

test("duplicate stored ids are repaired without dropping a row", () => {
  const storage = makeStorage(false);
  storage.setItem("bp.readings", JSON.stringify([
    { id: "dup", systolic: 120, diastolic: 80, pulse: null, ts: 10, note: "" },
    { id: "dup", systolic: 130, diastolic: 85, pulse: null, ts: 20, note: "" }
  ]));
  const Store = loadStore(storage);
  const first = Store.getReadings();
  assert.equal(first.length, 2);
  assert.equal(new Set(first.map((r) => r.id)).size, 2);
  const second = Store.getReadings();
  assert.deepEqual(second.map((r) => r.id), first.map((r) => r.id));
  assert.equal(Store.removeReading(first[0].id), true);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.getReadings()[0].id, first[1].id);
});

test("importReadings merges and skips duplicates", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  const res = Store.importReadings([
    { systolic: 120, diastolic: 80, ts: 10 },
    { systolic: 130, diastolic: 85, ts: 20 }
  ]);
  assert.equal(res.added, 1);
  assert.equal(res.skipped, 1);
  assert.equal(Store.getReadings().length, 2);
});

test("importReadings accepts wrapped backup object", () => {
  const Store = loadStore(makeStorage(false));
  const res = Store.importReadings({ readings: [{ systolic: 120, diastolic: 80, ts: 10 }] });
  assert.equal(res.added, 1);
  assert.equal(Store.getReadings().length, 1);
});

test("fractional readings are not stored", () => {
  const Store = loadStore(makeStorage(false));
  assert.equal(Store.addReading({ systolic: 120.5, diastolic: 80, ts: 10 }).added, false);
  assert.equal(Store.addReading({ systolic: 120, diastolic: 80, pulse: 70.2, ts: 10 }).added, false);
  assert.equal(Store.getReadings().length, 0);
});

test("quota failure does not report a saved reading", () => {
  const storage = makeStorage(false);
  const orig = storage.setItem.bind(storage);
  let fail = false;
  storage.setItem = (k, v) => {
    if (fail && k === "bp.readings") throw new Error("quota");
    return orig(k, v);
  };
  const Store = loadStore(storage);
  fail = true;
  const r = Store.addReading({ systolic: 120, diastolic: 80, ts: 10 });
  assert.equal(r.added, false);
  assert.equal(Store.getReadings().length, 0);
});

test("importReadings drops invalid entries", () => {
  const Store = loadStore(makeStorage(false));
  const res = Store.importReadings([{ systolic: 10, diastolic: 80, ts: 10 }, { systolic: 120, diastolic: 80, ts: 20 }]);
  assert.equal(res.added, 1);
  assert.equal(res.skipped, 1);
});

test("readings dated in the future are kept on read and rejected on add", () => {
  const Store = loadStore(makeStorage(false));
  const later = Date.now() + 3 * 24 * 60 * 60 * 1000;
  Store.setReadings([{ systolic: 120, diastolic: 80, ts: later }]);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.addReading({ systolic: 120, diastolic: 80, ts: later }).future, true);
  assert.equal(Store.getReadings().length, 1);
});

test("importReadings rejects future timestamps", () => {
  const Store = loadStore(makeStorage(false));
  const later = Date.now() + 3 * 24 * 60 * 60 * 1000;
  const res = Store.importReadings([
    { systolic: 120, diastolic: 80, ts: later },
    { systolic: 130, diastolic: 85, ts: 20 }
  ]);
  assert.equal(res.added, 1);
  assert.equal(res.skipped, 1);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.getReadings()[0].systolic, 130);
});

test("importReadings fills remaining room near the cap", () => {
  const Store = loadStore(makeStorage(false));
  const existing = [];
  for (let i = 0; i < 4998; i++) {
    existing.push({ id: "e" + i, systolic: 120, diastolic: 80, ts: i + 1 });
  }
  Store.setReadings(existing);
  const res = Store.importReadings([
    { id: "n1", systolic: 121, diastolic: 81, ts: 10000 },
    { id: "n2", systolic: 122, diastolic: 82, ts: 10001 },
    { id: "n3", systolic: 123, diastolic: 83, ts: 10002 }
  ]);
  assert.equal(res.added, 2);
  assert.equal(res.skipped, 1);
  assert.equal(res.full, true);
  assert.equal(Store.getReadings().length, 5000);
  assert.equal(Store.getReadings()[0].id, "n3");
  assert.equal(Store.getReadings()[1].id, "n2");
});

test("importReadings reports full when already at the cap", () => {
  const Store = loadStore(makeStorage(false));
  const existing = [];
  for (let i = 0; i < 5000; i++) {
    existing.push({ id: "e" + i, systolic: 120, diastolic: 80, ts: i + 1 });
  }
  Store.setReadings(existing);
  const res = Store.importReadings([{ id: "n1", systolic: 121, diastolic: 81, ts: 9000 }]);
  assert.equal(res.added, 0);
  assert.equal(res.full, true);
  assert.equal(Store.getReadings().length, 5000);
});

test("addReading remints a colliding id", () => {
  const Store = loadStore(makeStorage(false));
  Store.addReading({ id: "same", systolic: 120, diastolic: 80, ts: 10 });
  const r = Store.addReading({ id: "same", systolic: 130, diastolic: 85, ts: 20 });
  assert.equal(r.added, true);
  assert.notEqual(r.reading.id, "same");
  const ids = Store.getReadings().map((x) => x.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(Store.removeReading(r.reading.id), true);
  assert.equal(Store.getReadings().length, 1);
  assert.equal(Store.getReadings()[0].id, "same");
});

test("setReadings remints duplicate ids", () => {
  const Store = loadStore(makeStorage(false));
  const list = Store.setReadings([
    { id: "dup", systolic: 120, diastolic: 80, ts: 10 },
    { id: "dup", systolic: 130, diastolic: 85, ts: 20 }
  ]);
  assert.equal(list.length, 2);
  assert.equal(new Set(list.map((r) => r.id)).size, 2);
});

/* ---------------------------------------------------------- sw cacheable */
test("SRI hashes match the files they pin", () => {
  const root = join(here, "..");
  for (const name of ["index.html", "offline.html"]) {
    const html = readFileSync(join(root, name), "utf8");
    const re = /(?:src|href)="([^"]+)"[^>]*integrity="(sha256-[^"]+)"/g;
    let m;
    let n = 0;
    while ((m = re.exec(html))) {
      n += 1;
      const rel = m[1].replace(/\?.*$/, "");
      const bytes = readFileSync(join(root, rel));
      const hash = "sha256-" + createHash("sha256").update(bytes).digest("base64");
      assert.equal(hash, m[2], `${name} ${rel}`);
    }
    assert.ok(n > 0, `${name} should pin at least one file`);
  }
});

test("sw cacheable accepts empty search and ?v= stamps only", () => {
  const source = readFileSync(join(here, "..", "sw.js"), "utf8");
  const match = source.match(/function cacheable\(url\) \{\n[\s\S]*?\n\}/);
  assert.ok(match, "cacheable() should exist in sw.js");
  const cacheable = new Function(`${match[0]}; return cacheable;`)();
  assert.equal(cacheable(new URL("https://example.test/app/")), true);
  assert.equal(cacheable(new URL("https://example.test/app/static/js/app.js?v=0.1.6")), true);
  assert.equal(cacheable(new URL("https://example.test/app/?v=1")), true);
  assert.equal(cacheable(new URL("https://example.test/app/?foo=1")), false);
  assert.equal(cacheable(new URL("https://example.test/app/?v=0.1.6&x=1")), false);
  assert.equal(cacheable(new URL("https://example.test/app/?v=abc")), false);
});
