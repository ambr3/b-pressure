(function () {
  "use strict";

  function toNum(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function validate(input) {
    var sys = toNum(input && input.systolic);
    var dia = toNum(input && input.diastolic);
    var pulseRaw = input && input.pulse;
    var pulse = (pulseRaw == null || pulseRaw === "") ? null : toNum(pulseRaw);
    var errors = [];
    if (sys === null || sys < 40 || sys > 300) errors.push("systolic");
    if (dia === null || dia < 20 || dia > 200) errors.push("diastolic");
    if (pulse !== null && (pulse < 20 || pulse > 250)) errors.push("pulse");
    if (sys !== null && dia !== null && dia >= sys) errors.push("order");
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

  window.BP = {
    validate: validate,
    average: average,
    sortNewest: sortNewest,
    formatWhen: formatWhen,
    toLocalInput: toLocalInput,
    fromLocalInput: fromLocalInput
  };
})();