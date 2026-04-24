/**
 * 本机调试日志：写入 localStorage 环形缓冲，供后台「调试日志」查看与导出。
 * 不记录 Token、密码、Authorization 等敏感字段（调用方勿传入）。
 */
(function (global) {
  var KEY = "CAM_DEBUG_LOG_V1";
  var MAX_ENTRIES = 150;
  var MAX_AGE_MS = 6 * 60 * 60 * 1000;

  function nowMs() {
    return Date.now();
  }

  function loadRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) {
      try {
        localStorage.setItem(KEY, JSON.stringify(arr.slice(-40)));
      } catch (e2) {}
    }
  }

  function prune(arr) {
    var t = nowMs();
    var out = arr.filter(function (e) {
      return e && typeof e.t === "number" && t - e.t <= MAX_AGE_MS;
    });
    if (out.length > MAX_ENTRIES) out = out.slice(-MAX_ENTRIES);
    return out;
  }

  function add(level, source, message, meta) {
    var arr = prune(loadRaw());
    var entry = {
      t: nowMs(),
      iso: new Date().toISOString(),
      level: level || "info",
      source: source || "",
      message: String(message || "").slice(0, 2000),
    };
    if (meta != null && typeof meta === "object") {
      try {
        entry.meta = JSON.parse(JSON.stringify(meta));
      } catch (e) {
        entry.meta = { note: "meta 无法序列化" };
      }
    }
    arr.push(entry);
    save(arr);
  }

  function getRecent(n) {
    var arr = prune(loadRaw());
    if (n && n > 0) return arr.slice(-n);
    return arr;
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function exportJson() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        href: typeof location !== "undefined" ? location.href : "",
        entries: getRecent(),
      },
      null,
      2
    );
  }

  /** 若地址栏含 ce_debug_log=1（或 true/yes/export），则下载 JSON 并从 URL 去掉该参数，避免刷新重复下载。 */
  function exportFromUrlIfRequested() {
    try {
      if (typeof location === "undefined" || !location.search) return;
      var q = new URLSearchParams(location.search);
      var raw = (q.get("ce_debug_log") || "").trim().toLowerCase();
      if (!raw) return;
      if (raw !== "1" && raw !== "true" && raw !== "yes" && raw !== "export") return;
      if (typeof document === "undefined" || !document.body) return;
      var text = exportJson();
      var blob = new Blob([text], { type: "application/json;charset=utf-8" });
      var a = document.createElement("a");
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "camera-ency-debug-log.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 2000);
      q.delete("ce_debug_log");
      var qs = q.toString();
      var next = location.pathname + (qs ? "?" + qs : "") + (location.hash || "");
      if (typeof history !== "undefined" && history.replaceState) {
        history.replaceState(null, "", next);
      }
    } catch (e) {}
  }

  global.DebugLog = {
    add: add,
    getRecent: getRecent,
    clear: clear,
    exportJson: exportJson,
    exportFromUrlIfRequested: exportFromUrlIfRequested,
  };
})(window);
