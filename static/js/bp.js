(function () {
  "use strict";

  function toNum(v) {
    if (typeof v === "string") {
      v = v.trim();
      if (v === "") return null;
    } else if (v == null) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function whole(n) {
    return typeof n === "number" && isFinite(n) && Math.round(n) === n;
  }

  function validate(input) {
    var sys = toNum(input && input.systolic);
    var dia = toNum(input && input.diastolic);
    var pulseRaw = input && input.pulse;
    var pulse = (pulseRaw == null || (typeof pulseRaw === "string" && pulseRaw.trim() === "")) ? null : toNum(pulseRaw);
    var errors = [];
    if (sys === null || !whole(sys) || sys < 40 || sys > 300) errors.push("systolic");
    if (dia === null || !whole(dia) || dia < 20 || dia > 200) errors.push("diastolic");
    if (pulse !== null && (!whole(pulse) || pulse < 20 || pulse > 250)) errors.push("pulse");
    if (whole(sys) && whole(dia) && dia >= sys) errors.push("order");
    return { ok: errors.length === 0, errors: errors, systolic: sys, diastolic: dia, pulse: pulse };
  }

  function average(readings) {
    if (!Array.isArray(readings) || readings.length === 0) return null;
    var n = readings.length;
    var sysSum = 0, diaSum = 0, pulseSum = 0, pulseCount = 0;
    var minSys = Infinity, maxSys = -Infinity, minDia = Infinity, maxDia = -Infinity;
    var minTs = Infinity, maxTs = -Infinity;
    for (var i = 0; i < readings.length; i++) {
      var r = readings[i];
      sysSum += r.systolic;
      diaSum += r.diastolic;
      if (r.pulse != null) { pulseSum += r.pulse; pulseCount++; }
      if (r.systolic < minSys) minSys = r.systolic;
      if (r.systolic > maxSys) maxSys = r.systolic;
      if (r.diastolic < minDia) minDia = r.diastolic;
      if (r.diastolic > maxDia) maxDia = r.diastolic;
      if (r.ts < minTs) minTs = r.ts;
      if (r.ts > maxTs) maxTs = r.ts;
    }
    return {
      count: n,
      systolic: Math.round((sysSum / n) * 10) / 10,
      diastolic: Math.round((diaSum / n) * 10) / 10,
      pulse: pulseCount ? Math.round((pulseSum / pulseCount) * 10) / 10 : null,
      pulseCount: pulseCount,
      minSystolic: minSys,
      maxSystolic: maxSys,
      minDiastolic: minDia,
      maxDiastolic: maxDia,
      from: minTs,
      to: maxTs
    };
  }

  function sortNewest(readings) {
    return (readings || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  }

  function formatWhen(ts) {
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString();
    } catch (err) {
      return "";
    }
  }

  function toLocalInput(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    var pad = function (x) { return String(x).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function fromLocalInput(value) {
    if (!value) return null;
    var t = Date.parse(value);
    return isFinite(t) ? t : null;
  }

  function pad(value, width, alignRight) {
    var s = String(value == null ? "" : value);
    if (s.length >= width) return s.slice(0, width);
    var gap = " ".repeat(width - s.length);
    return alignRight ? gap + s : s + gap;
  }

  function formatAverageLine(avg) {
    if (!avg) return "Average: none";
    var line = "Average: " + avg.systolic + "/" + avg.diastolic + " mmHg";
    if (avg.pulse != null) {
      line += " · pulse " + avg.pulse + " bpm (" + avg.pulseCount + " of " + avg.count + ")";
    }
    line += " across " + avg.count + " reading" + (avg.count === 1 ? "" : "s");
    return line;
  }

  function formatPrintLines(readings, options) {
    var list = sortNewest(readings || []);
    var printed = options && options.printedAt != null ? options.printedAt : Date.now();
    var lines = [];
    lines.push("Seclusa BP");
    lines.push("Printed: " + formatWhen(printed));
    lines.push("Readings: " + list.length);
    lines.push(formatAverageLine(average(list)));
    lines.push("");
    lines.push(
      pad("When", 22) + "  " +
      pad("Sys", 3, true) + "  " +
      pad("Dia", 3, true) + "  " +
      pad("Pulse", 5, true) + "  Note"
    );
    lines.push("-".repeat(72));
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      var pulse = r.pulse == null ? "—" : String(r.pulse);
      var note = String(r.note || "").replace(/\s+/g, " ").trim();
      lines.push(
        pad(formatWhen(r.ts) || "—", 22) + "  " +
        pad(r.systolic, 3, true) + "  " +
        pad(r.diastolic, 3, true) + "  " +
        pad(pulse, 5, true) + "  " + note
      );
    }
    if (list.length === 0) lines.push("(no readings)");
    return lines;
  }

  function formatPrintText(readings, options) {
    return formatPrintLines(readings, options).join("\n") + "\n";
  }

  window.BP = {
    validate: validate,
    average: average,
    sortNewest: sortNewest,
    formatWhen: formatWhen,
    toLocalInput: toLocalInput,
    fromLocalInput: fromLocalInput,
    formatPrintLines: formatPrintLines,
    formatPrintText: formatPrintText
  };
})();