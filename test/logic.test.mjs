/* Tests for the pure logic in the app.
   No dependencies, no framework: run with `node --test test/`. */
import { test } from "node:test";
import assert from "node:assert/strict";
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

test("erasing everything erases theme too", () => {
  const storage = makeStorage(false);
  const Store = loadStore(storage);
  Store.setTheme("dark");
  assert.ok(storage.getItem("ssc.pref_key_night_mode"));
  Store.clearAll();
  assert.equal(storage.getItem("ssc.pref_key_night_mode"), null);
  assert.equal(storage.getItem("bp.readings"), null);
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
