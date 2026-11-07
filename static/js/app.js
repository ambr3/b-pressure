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

  var openSheetId = null;

  function showSheet(id) {
    closeSheet();
    openSheetId = id;
    var scrim = $("scrim");
    var sheet = $(id);
    if (scrim) scrim.classList.add("open");
    if (sheet) {
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
    }
  }

  function closeSheet() {
    if (openSheetId) {
      var sheet = $(openSheetId);
      if (sheet) {
        sheet.classList.remove("open");
        sheet.setAttribute("aria-hidden", "true");
      }
    }
    openSheetId = null;
    var scrim = $("scrim");
    if (scrim) scrim.classList.remove("open");
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
      ? "<div class=\"avg-row\"><span class=\"avg-label\">Pulse</span><span class=\"avg-value\">" + escapeHtml(fmtNum(avg.pulse)) + " bpm</span><span class=\"avg-sub\">(" + escapeHtml(avg.pulseCount) + " of " + escapeHtml(avg.count) + ")</span></div>"
      : "";
    el.innerHTML =
      "<div class=\"avg-row\"><span class=\"avg-label\">Systolic</span><span class=\"avg-value\">" + escapeHtml(fmtNum(avg.systolic)) + " mmHg</span><span class=\"avg-sub\">" + escapeHtml(avg.minSystolic) + "–" + escapeHtml(avg.maxSystolic) + "</span></div>" +
      "<div class=\"avg-row\"><span class=\"avg-label\">Diastolic</span><span class=\"avg-value\">" + escapeHtml(fmtNum(avg.diastolic)) + " mmHg</span><span class=\"avg-sub\">" + escapeHtml(avg.minDiastolic) + "–" + escapeHtml(avg.maxDiastolic) + "</span></div>" +
      pulseLine +
      "<div class=\"avg-foot\">Across " + escapeHtml(avg.count) + " reading" + (avg.count === 1 ? "" : "s") + "</div>";
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
          "<span class=\"reading-values\">" + escapeHtml(r.systolic) + "/" + escapeHtml(r.diastolic) + "</span>" +
          "<span class=\"reading-pulse\">" + escapeHtml(pulse) + "</span>" +
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderAll() {
    renderAverage();
    renderList();
  }

  function boot() {
    window.Theme.apply(window.Theme.current());

    var status = $("status");
    if (status && !window.Store.isPersistent()) {
      status.textContent = "Storage is blocked, so this session will not be remembered.";
    }

    var scrim = $("scrim");
    if (scrim) scrim.addEventListener("click", closeSheet);
    var aboutBtn = $("nav-about");
    if (aboutBtn) aboutBtn.addEventListener("click", function () { showSheet("sheet-about"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheet();
    });

    if (window.SeclusaThemeSheet) {
      window.SeclusaThemeSheet.wire({
        getMode: function () { return window.Theme.current(); },
        setMode: function (mode) { window.Theme.set(mode); },
        showSheet: showSheet
      });
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
        refreshBackupMeta();
        if (form) form.reset();
        if (whenInput) whenInput.value = window.BP.toLocalInput(Date.now());
        toast("All data cleared.");
        renderAll();
      });
    }

    var LAST_KEY = "seclusa-bp-last-backup";
    var SB = window.SeclusaBackup;

    function refreshBackupMeta() {
      var label = $("bu-last");
      var nag = $("bu-nag");
      if (!SB) return;
      if (label) label.textContent = SB.lastBackupLabel(LAST_KEY);
      if (nag) {
        var text = SB.lastBackupNagText(LAST_KEY);
        nag.textContent = text;
        nag.hidden = !text;
      }
    }

    function markBackupDone() {
      if (SB) SB.lastBackupMark(LAST_KEY);
      refreshBackupMeta();
    }

    var backupBtn = $("nav-backup");
    if (backupBtn) {
      backupBtn.addEventListener("click", function () {
        refreshBackupMeta();
        showSheet("sheet-backup");
      });
    }

    function promptPassword(title, body, okLabel) {
      return new Promise(function (resolve) {
        var dlg = $("dlg-password");
        if (!dlg) {
          resolve(window.prompt(title + "\n\n" + body) || null);
          return;
        }
        $("pw-title").textContent = title;
        $("pw-text").textContent = body;
        var input = $("pw-input");
        input.value = "";
        $("pw-ok").textContent = okLabel;
        var settled = false;
        function cleanup() {
          dlg.removeEventListener("cancel", onCancel);
          dlg.removeEventListener("close", onClose);
          $("pw-ok").onclick = null;
          $("pw-cancel").onclick = null;
          input.onkeydown = null;
        }
        function done(v) {
          if (settled) return;
          settled = true;
          input.value = "";
          cleanup();
          if (dlg.open) dlg.close();
          resolve(v);
        }
        function onCancel() { done(null); }
        function onClose() { if (!dlg.open) done(null); }
        dlg.addEventListener("cancel", onCancel);
        dlg.addEventListener("close", onClose);
        $("pw-ok").onclick = function () { done(input.value); };
        $("pw-cancel").onclick = function () { done(null); };
        input.onkeydown = function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            done(input.value);
          }
        };
        if (dlg.open) dlg.close();
        dlg.showModal();
        setTimeout(function () { input.focus(); }, 50);
      });
    }

    async function promptNewPassword() {
      var first = await promptPassword(
        "Set a password",
        "The export is encrypted with this password. There is no way to recover the readings without it.",
        "Encrypt and export"
      );
      if (!first) return null;
      var second = await promptPassword(
        "Confirm password",
        "The export is encrypted with this password. There is no way to recover the readings without it.",
        "Encrypt and export"
      );
      if (second === null) return null;
      if (first !== second) {
        toast("Passwords do not match");
        return null;
      }
      var minLen = (SB && SB.MIN_PASSWORD_LENGTH) || 8;
      if (first.length < minLen) {
        toast("Use at least " + minLen + " characters.");
        return null;
      }
      return first;
    }

    function buildBackup() {
      var readings = window.Store.exportReadings();
      return {
        format: "bp-backup",
        version: 1,
        exported: new Date().toISOString(),
        readings: readings
      };
    }

    async function preparePayload(encrypted) {
      var data = buildBackup();
      var text = JSON.stringify(data, null, 2);
      var stamp = SB && SB.backupDateStamp ? SB.backupDateStamp() : new Date().toISOString().slice(0, 10);
      var name = "bp-backup-" + stamp + ".json";
      var type = "application/json";
      if (encrypted) {
        if (!SB || !SB.cryptoBox || !SB.cryptoBox.supported) {
          toast("Encryption is unavailable in this browser.");
          return null;
        }
        var password = await promptNewPassword();
        if (!password) return null;
        try {
          toast("Encrypting…");
          var box = await SB.cryptoBox.encrypt(text, password);
          text = JSON.stringify(box, null, 2);
          name = "bp-backup-" + stamp + ".enc.json";
          type = "application/octet-stream";
        } catch (err) {
          toast(err && err.message ? err.message : "Backup failed.");
          return null;
        }
      }
      return { text: text, name: name, type: type, encrypted: !!encrypted, count: data.readings.length };
    }

    var backupBusy = false;

    async function shareBackup(encrypted) {
      if (backupBusy) return;
      if (!SB) {
        toast("Sharing isn’t available here. Use Save / Download instead.");
        return;
      }
      backupBusy = true;
      try {
        var prepared = await preparePayload(encrypted);
        if (!prepared) return;
        var file = new File([prepared.text], prepared.name, { type: prepared.type });
        var result = await SB.shareFile(file);
        if (result === "shared") {
          markBackupDone();
          toast(prepared.encrypted ? "Encrypted backup shared." : "Backup shared (" + prepared.count + ").");
          return;
        }
        if (result === "abort") return;
        toast("Sharing isn’t available here. Use Save / Download instead.");
      } finally {
        backupBusy = false;
      }
    }

    async function saveBackup(encrypted) {
      if (backupBusy) return;
      if (!SB) {
        toast("Backup helpers failed to load.");
        return;
      }
      backupBusy = true;
      try {
        var prepared = await preparePayload(encrypted);
        if (!prepared) return;
        var blob = new Blob([prepared.text], { type: "application/json" });
        var how = await SB.saveBlob(blob, prepared.name);
        if (how === null) return;
        markBackupDone();
        if (how === "picker") {
          toast(prepared.encrypted ? "Encrypted backup saved." : "Backup saved (" + prepared.count + ").");
        } else {
          toast(prepared.encrypted ? "Encrypted backup downloaded." : "Backup downloaded (" + prepared.count + ").");
        }
      } finally {
        backupBusy = false;
      }
    }

    refreshBackupMeta();
    var encOk = !!(SB && SB.cryptoBox && SB.cryptoBox.supported);
    var shareBtn = $("btn-share");
    var exportBtn = $("btn-export");
    var shareEncBtn = $("btn-share-enc");
    var exportEncBtn = $("btn-export-enc");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        shareBackup(false).catch(function () { toast("Backup failed."); });
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        saveBackup(false).catch(function () { toast("Backup failed."); });
      });
    }
    if (shareEncBtn) {
      shareEncBtn.hidden = !encOk;
      shareEncBtn.addEventListener("click", function () {
        shareBackup(true).catch(function () { toast("Backup failed."); });
      });
    }
    if (exportEncBtn) {
      exportEncBtn.hidden = !encOk;
      exportEncBtn.addEventListener("click", function () {
        saveBackup(true).catch(function () { toast("Backup failed."); });
      });
    }

    var importInput = $("f-import");
    var importSerial = 0;
    if (importInput) {
      importInput.addEventListener("change", function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          toast("File too large.");
          importInput.value = "";
          return;
        }
        var serial = ++importSerial;
        var reader = new FileReader();
        reader.onload = async function () {
          if (serial !== importSerial) return;
          var result = { added: 0, skipped: 0 };
          if (typeof reader.result === "string" && reader.result.length > 5 * 1024 * 1024) {
            toast("File too large.");
            importInput.value = "";
            return;
          }
          try {
            var parsed = JSON.parse(reader.result);
            if (SB && SB.isEncryptedContainer(parsed)) {
              var password = await promptPassword(
                "Password required",
                "This file is encrypted. Enter the password it was exported with.",
                "Decrypt and import"
              );
              if (serial !== importSerial) return;
              if (password === null) {
                importInput.value = "";
                return;
              }
              try {
                parsed = JSON.parse(await SB.cryptoBox.decrypt(parsed, password));
              } catch (err) {
                toast(err && err.message ? err.message : "Wrong password, or the file is damaged.");
                importInput.value = "";
                return;
              }
              if (serial !== importSerial) return;
            }
            if (!Array.isArray(parsed) && !(parsed && typeof parsed === "object" && Array.isArray(parsed.readings))) {
              toast("Could not read file.");
              importInput.value = "";
              return;
            }
            result = window.Store.importReadings(parsed);
          } catch (err) {
            toast("Could not read file.");
            importInput.value = "";
            return;
          }
          if (serial !== importSerial) return;
          if (result.saved === false) {
            toast("Could not save.");
          } else if (result.full && result.added === 0) {
            toast("Not imported: already at the 5000-reading limit.");
          } else if (result.full) {
            toast("Imported " + result.added + " (limit reached), skipped " + result.skipped + ".");
          } else {
            toast("Imported " + result.added + ", skipped " + result.skipped + ".");
          }
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