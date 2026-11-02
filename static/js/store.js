/*
 * Blood Pressure — local storage.
 */
(function () {
  "use strict";

  var KEY_READINGS = "bp.readings";
  var KEY_SETTINGS = "bp.settings";
  var KEY_THEME = "ssc.pref_key_night_mode";

  var memory = Object.create(null);

  function backing() {
    try {
      var ls = window.localStorage;
      var probe = "__bp_probe__";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      return ls;
    } catch (err) {
      return null;
    }
  }

  var store = backing();

  function readRaw(key) {
    try {
      if (store) return store.getItem(key);
      return key in memory ? memory[key] : null;
    } catch (err) {
      return key in memory ? memory[key] : null;
    }
  }

  function writeRaw(key, value) {
    try {
      if (store) {
        store.setItem(key, value);
        return true;
      }
    } catch (err) { }
    memory[key] = value;
    return false;
  }

  function removeRaw(key) {
    try {
      if (store) store.removeItem(key);
    } catch (err) { }
    delete memory[key];
  }

  function readJSON(key, fallback) {
    var raw = readRaw(key);
    if (raw === null || raw === "") return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      removeRaw(key);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      return writeRaw(key, JSON.stringify(value));
    } catch (err) {
      return false;
    }
  }

  function getSettings() {
    var stored = readJSON(KEY_SETTINGS, {});
    if (!stored || typeof stored !== "object") stored = {};
    return {
      theme: stored.theme === "light" || stored.theme === "dark" ? stored.theme : "system"
    };
  }

  function setSettings(patch) {
    var next = getSettings();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    }
    writeJSON(KEY_SETTINGS, next);
    return next;
  }

  function getTheme() {
    try {
      var v = window.localStorage.getItem(KEY_THEME);
      if (v === "light" || v === "dark") return v;
    } catch (err) { }
    return getSettings().theme;
  }

  function setTheme(theme) {
    var value = theme === "light" || theme === "dark" ? theme : "system";
    setSettings({ theme: value });
    try {
      if (value === "system") window.localStorage.removeItem(KEY_THEME);
      else window.localStorage.setItem(KEY_THEME, value);
    } catch (err) {
      writeRaw(KEY_THEME, value);
    }
    return value;
  }

  var MAX_READINGS = 5000;
  var MAX_NOTE = 120;
  var MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

  function isFuture(ts) {
    return ts > Date.now() + MAX_FUTURE_MS;
  }

  function cleanNote(value) {
    return String(value == null ? "" : value)
      .replace(/[\r\n\t\x00-\x1f\x7f]/g, " ")
      .slice(0, MAX_NOTE);
  }

  function cleanReading(r) {
    if (!r || typeof r !== "object") return null;
    var sys = Number(r.systolic);
    var dia = Number(r.diastolic);
    if (!isFinite(sys) || !isFinite(dia)) return null;
    sys = Math.round(sys);
    dia = Math.round(dia);
    if (sys < 40 || sys > 300) return null;
    if (dia < 20 || dia > 200) return null;
    if (dia >= sys) return null;
    var pulse = r.pulse == null || r.pulse === "" ? null : Math.round(Number(r.pulse));
    if (pulse !== null && (!isFinite(pulse) || pulse < 20 || pulse > 250)) return null;
    var ts = Number(r.ts);
    if (!isFinite(ts) || ts <= 0) ts = Date.now();
    var id = String(r.id || "");
    if (/[^\w-]/.test(id)) id = "";
    id = id.slice(0, 64);
    if (!id) id = "r" + ts + "-" + Math.random().toString(36).slice(2, 8);
    return {
      id: id,
      systolic: sys,
      diastolic: dia,
      pulse: pulse,
      ts: ts,
      note: cleanNote(r.note)
    };
  }

  function getReadings() {
    var value = readJSON(KEY_READINGS, []);
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length; i++) {
      var c = cleanReading(value[i]);
      if (c) out.push(c);
    }
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }

  function setReadings(value) {
    var list = Array.isArray(value) ? value : [];
    var cleaned = [];
    for (var i = 0; i < list.length; i++) {
      var c = cleanReading(list[i]);
      if (c) cleaned.push(c);
    }
    cleaned.sort(function (a, b) { return b.ts - a.ts; });
    if (cleaned.length > MAX_READINGS) cleaned = cleaned.slice(0, MAX_READINGS);
    writeJSON(KEY_READINGS, cleaned);
    return cleaned;
  }

  function addReading(input) {
    var c = cleanReading(input);
    if (!c) return { added: false };
    if (isFuture(c.ts)) return { added: false, future: true };
    var list = getReadings();
    for (var i = 0; i < list.length; i++) {
      if (list[i].ts === c.ts && list[i].systolic === c.systolic && list[i].diastolic === c.diastolic && list[i].pulse === c.pulse) {
        return { added: false, duplicate: true };
      }
    }
    list.unshift(c);
    if (list.length > MAX_READINGS) list = list.slice(0, MAX_READINGS);
    writeJSON(KEY_READINGS, list);
    return { added: true, reading: c };
  }

  function removeReading(id) {
    var list = getReadings();
    var next = list.filter(function (r) { return r.id !== id; });
    if (next.length === list.length) return false;
    writeJSON(KEY_READINGS, next);
    return true;
  }

  function exportReadings() {
    return getReadings().slice();
  }

  function importReadings(value) {
    var incoming = Array.isArray(value) ? value : (value && Array.isArray(value.readings) ? value.readings : []);
    var list = getReadings();
    var ids = Object.create(null);
    var sigs = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      ids[list[i].id] = true;
      sigs[list[i].ts + "|" + list[i].systolic + "|" + list[i].diastolic + "|" + (list[i].pulse == null ? "" : list[i].pulse)] = true;
    }
    var fresh = [];
    var skipped = 0;
    for (var j = 0; j < incoming.length; j++) {
      var c = cleanReading(incoming[j]);
      if (!c || isFuture(c.ts)) { skipped++; continue; }
      var sig = c.ts + "|" + c.systolic + "|" + c.diastolic + "|" + (c.pulse == null ? "" : c.pulse);
      if (ids[c.id] || sigs[sig]) { skipped++; continue; }
      fresh.push(c);
      ids[c.id] = true;
      sigs[sig] = true;
    }
    if (list.length + fresh.length > MAX_READINGS) return { added: 0, skipped: skipped, full: true };
    var next = list.concat(fresh).sort(function (a, b) { return b.ts - a.ts; });
    writeJSON(KEY_READINGS, next);
    return { added: fresh.length, skipped: skipped };
  }

  function clearAll() {
    removeRaw(KEY_READINGS);
    removeRaw(KEY_SETTINGS);
    removeRaw(KEY_THEME);
  }

  window.Store = {
    getReadings: getReadings,
    setReadings: setReadings,
    isFuture: isFuture,
    addReading: addReading,
    removeReading: removeReading,
    exportReadings: exportReadings,
    importReadings: importReadings,
    getSettings: getSettings,
    setSettings: setSettings,
    getTheme: getTheme,
    setTheme: setTheme,
    clearAll: clearAll,
    isPersistent: function () { return !!store; }
  };
})();