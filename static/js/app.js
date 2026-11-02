(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  function toast(message) {
    var node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.hidden = true; }, 2400);
  }

  function themeLabel(mode) {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function cycleTheme() {
    var order = ["system", "light", "dark"];
    var current = window.Theme.current();
    var next = order[(order.indexOf(current) + 1) % order.length];
    window.Theme.set(next);
    updateThemeButton();
    toast("Theme: " + next);
  }

  function updateThemeButton() {
    var button = $("btn-theme");
    if (button) button.textContent = themeLabel(window.Theme.current());
  }

  function fmtNum(n) {
    if (n === null || n === undefined) return "—";
    return String(n);
  }

  function renderAverage() {
    var el = $("average");
    if (!el) return;
    var readings = window.Store.getReadings();
    var avg = window.BP.average(readings);
    if (!avg) {
      el.innerHTML = "<p class=\"muted nomargin\">No readings yet.</p>";
      return;
    }
    var pulseLine = avg.pulse !== null
      ? "<div class=\"avg-row\"><span class=\"avg-label\">Pulse</span><span class=\"avg-value\">" + fmtNum(avg.pulse) + " bpm</span><span class=\"avg-sub\">(" + avg.pulseCount + " of " + avg.count + ")</span></div>"
      : "";
    el.innerHTML =
      "<div class=\"avg-row\"><span class=\"avg-label\">Systolic</span><span class=\"avg-value\">" + fmtNum(avg.systolic) + " mmHg</span><span class=\"avg-sub\">" + avg.minSystolic + "–" + avg.maxSystolic + "</span></div>" +
      "<div class=\"avg-row\"><span class=\"avg-label\">Diastolic</span><span class=\"avg-value\">" + fmtNum(avg.diastolic) + " mmHg</span><span class=\"avg-sub\">" + avg.minDiastolic + "–" + avg.maxDiastolic + "</span></div>" +
      pulseLine +
      "<div class=\"avg-foot\">Across " + avg.count + " reading" + (avg.count === 1 ? "" : "s") + "</div>";
  }

  function renderList() {
    var list = $("reading-list");
    var empty = $("empty");
    if (!list) return;
    var readings = window.Store.getReadings();
    list.innerHTML = "";
    if (readings.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    readings.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "reading";
      var pulse = r.pulse != null ? " · " + r.pulse + " bpm" : "";
      var note = r.note ? "<div class=\"reading-note\">" + escapeHtml(r.note) + "</div>" : "";
      li.innerHTML =
        "<div class=\"reading-main\">" +
          "<span class=\"reading-values\">" + r.systolic + "/" + r.diastolic + "</span>" +
          "<span class=\"reading-pulse\">" + pulse + "</span>" +
        "</div>" +
        "<div class=\"reading-meta\">" + escapeHtml(window.BP.formatWhen(r.ts)) + "</div>" +
        note +
        "<button type=\"button\" class=\"reading-delete\" data-id=\"" + escapeHtml(r.id) + "\" aria-label=\"Delete reading\">×</button>";
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAll() {
    renderAverage();
    renderList();
  }

  function boot() {
    window.Theme.apply(window.Theme.current());
    updateThemeButton();

    var button = $("btn-theme");
    if (button) button.addEventListener("click", cycleTheme);

    var status = $("status");
    if (status) {
      status.textContent = window.Store.isPersistent()
        ? "Saved on this device."
        : "Storage is blocked, so this session will not be remembered.";
    }

    // default "when" to now
    var whenInput = $("f-when");
    if (whenInput && !whenInput.value) {
      whenInput.value = window.BP.toLocalInput(Date.now());
    }

    var form = $("reading-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var sys = $("f-sys").value;
        var dia = $("f-dia").value;
        var pulse = $("f-pulse").value;
        var when = window.BP.fromLocalInput($("f-when").value);
        var note = $("f-note").value;
        var v = window.BP.validate({ systolic: sys, diastolic: dia, pulse: pulse });
        if (!v.ok) {
          toast("Check: " + v.errors.join(", "));
          return;
        }
        if (when != null && window.Store.isFuture(when)) {
          toast("Check: when");
          return;
        }
        var result = window.Store.addReading({
          systolic: v.systolic,
          diastolic: v.diastolic,
          pulse: v.pulse,
          ts: when != null ? when : Date.now(),
          note: note
        });
        if (!result.added) {
          toast(result.duplicate ? "Already recorded." : "Could not save.");
          return;
        }
        toast("Reading added.");
        form.reset();
        if (whenInput) whenInput.value = window.BP.toLocalInput(Date.now());
        renderAll();
      });
    }

    var list = $("reading-list");
    if (list) {
      list.addEventListener("click", function (e) {
        var target = e.target;
        if (!target || !target.classList || !target.classList.contains("reading-delete")) return;
        var id = target.getAttribute("data-id");
        if (!id) return;
        if (window.Store.removeReading(id)) {
          toast("Deleted.");
          renderAll();
        }
      });
    }

    var clearBtn = $("btn-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!window.confirm("Delete all readings? This cannot be undone.")) return;
        window.Store.clearAll();
        toast("All data cleared.");
        renderAll();
      });
    }

    var exportBtn = $("btn-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var data = { format: "bp-backup", version: 1, exported: new Date().toISOString(), readings: window.Store.exportReadings() };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "bp-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast("Exported " + data.readings.length + " reading" + (data.readings.length === 1 ? "" : "s") + ".");
      });
    }

    var importInput = $("f-import");
    if (importInput) {
      importInput.addEventListener("change", function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          toast("File too large.");
          importInput.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var result = { added: 0, skipped: 0 };
          if (typeof reader.result === "string" && reader.result.length > 5 * 1024 * 1024) {
            toast("File too large.");
            importInput.value = "";
            return;
          }
          try {
            var parsed = JSON.parse(reader.result);
            result = window.Store.importReadings(parsed);
          } catch (err) {
            toast("Could not read file.");
            importInput.value = "";
            return;
          }
          toast(result.full
            ? "Not imported: it would go over the 5000-reading limit."
            : "Imported " + result.added + ", skipped " + result.skipped + ".");
          renderAll();
          importInput.value = "";
        };
        reader.onerror = function () {
          toast("Could not read file.");
          importInput.value = "";
        };
        reader.readAsText(file);
      });
    }

    renderAll();

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();