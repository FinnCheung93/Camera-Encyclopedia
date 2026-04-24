/**
 * 通过 GitHub Contents API 读写 data.json；本地模式直接 fetch 文件。
 */
(function (global) {
  var shaCache = null;

  var LS_TOKEN_KEY = "CAM_GITHUB_PAT";

  function tokenFromLocalStorage() {
    try {
      return (localStorage.getItem(LS_TOKEN_KEY) || "").replace(/\s+/g, "").trim();
    } catch (e) {
      return "";
    }
  }

  function cfg() {
    var c = global.APP_CONFIG || {};
    var g = c.github || {};
    var raw = g.token == null ? "" : String(g.token);
    var fromFile = raw.replace(/\s+/g, "").trim();
    if (fromFile === "YOUR_GITHUB_PAT") fromFile = "";
    var fromLs = tokenFromLocalStorage();
    return {
      owner: (g.owner && String(g.owner).trim()) || "",
      repo: (g.repo && String(g.repo).trim()) || "",
      /** 优先本机 localStorage（避免把 PAT 写进仓库触发 Secret scanning） */
      token: fromLs || fromFile,
      branch: (g.branch && String(g.branch).trim()) || "gh-pages",
      dataPath: (g.dataPath && String(g.dataPath).trim()) || "data.json",
      useLocal: !!c.useLocalDataJson,
    };
  }

  function apiHeaders(withToken) {
    var h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (withToken) {
      var token = cfg().token;
      if (token) h.Authorization = "Bearer " + token;
    }
    return h;
  }

  function authHeaders() {
    return apiHeaders(true);
  }

  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ""))));
  }

  function apiUrl(path) {
    var g = cfg();
    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(g.owner) +
      "/" +
      encodeURIComponent(g.repo) +
      "/" +
      path
    );
  }

  function logDbg(level, msg, meta) {
    try {
      if (global.DebugLog && global.DebugLog.add) {
        global.DebugLog.add(level || "info", "github-storage", msg, meta);
      }
    } catch (e) {}
  }

  /** 避免 fetch 长时间挂起导致页面一直停在「加载中」 */
  async function fetchWithTimeout(url, init, timeoutMs) {
    var ms = timeoutMs || 25000;
    if (typeof AbortController === "undefined") {
      return await fetch(url, init || {});
    }
    var controller = new AbortController();
    var timer = setTimeout(function () {
      try {
        controller.abort();
      } catch (e) {}
    }, ms);
    try {
      return await fetch(url, Object.assign({}, init || {}, { signal: controller.signal }));
    } catch (e) {
      if (e && e.name === "AbortError") {
        throw new Error(
          "请求 GitHub 超时（约 " +
            Math.round(ms / 1000) +
            " 秒内无响应），请检查网络或对 api.github.com 的访问。"
        );
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadContentsOnce(useToken) {
    var g = cfg();
    var url =
      apiUrl("contents/" + encodeURIComponent(g.dataPath)) + "?ref=" + encodeURIComponent(g.branch);
    var res = await fetchWithTimeout(url, { headers: apiHeaders(!!useToken) }, 25000);
    var text = await res.text();
    return { res: res, text: text };
  }

  /** 公开仓库只读：绕过 Contents API（部分地区/网络下匿名 Contents 会 403，raw 仍可读） */
  function rawDataJsonUrl(g) {
    var path = String(g.dataPath || "data.json").replace(/^\/+/, "");
    var parts = path.split("/").filter(Boolean).map(function (p) {
      return encodeURIComponent(p);
    });
    return (
      "https://raw.githubusercontent.com/" +
      encodeURIComponent(g.owner) +
      "/" +
      encodeURIComponent(g.repo) +
      "/" +
      encodeURIComponent(g.branch) +
      "/" +
      parts.join("/")
    );
  }

  async function loadJsonViaRawPublic(g) {
    var url = rawDataJsonUrl(g);
    logDbg("info", "尝试 raw.githubusercontent.com", { url: url });
    var res = await fetchWithTimeout(url, { cache: "no-store" }, 25000);
    if (!res.ok) {
      throw new Error("raw 直链 HTTP " + res.status);
    }
    shaCache = null;
    return await res.json();
  }

  async function loadJson() {
    var g = cfg();
    var pagePath = "";
    try {
      if (typeof location !== "undefined") pagePath = location.pathname || "";
    } catch (e) {}
    logDbg("info", "loadJson 开始", {
      page: pagePath,
      useLocal: !!g.useLocal,
      owner: g.owner,
      repo: g.repo,
      branch: g.branch,
      dataPath: g.dataPath,
    });
    try {
      if (g.useLocal) {
        var res = await fetchWithTimeout("./data.json", { cache: "no-store" }, 25000);
        if (!res.ok) throw new Error("无法读取本地 data.json（HTTP " + res.status + "）");
        shaCache = null;
        var localData = await res.json();
        logDbg("info", "loadJson 成功(本地)", {
          categories: (localData.categoryConfig || []).length,
          cameras: (localData.cameraData || []).length,
        });
        return localData;
      }
      if (!g.owner || !g.repo) {
        throw new Error("请在 config.js 填写 github.owner 与 github.repo。");
      }

      /**
       * 公开仓库：GitHub Contents API 允许匿名读取（有频率限制），访客浏览前台无需 Token。
       * 私有仓库：匿名会 404，需带 PAT；后台保存始终需要 PAT。
       */
      var t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      logDbg("info", "GitHub Contents 请求（匿名）");
      var first = await loadContentsOnce(false);
      var dt = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      logDbg("info", "GitHub Contents 首响应", {
        ok: first.res.ok,
        status: first.res.status,
        ms: Math.round(dt),
      });
      var res = first.res;
      var text = first.text;
      if (!res.ok && g.token) {
        logDbg("info", "匿名失败，使用 Token 重试");
        t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
        var second = await loadContentsOnce(true);
        dt = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        logDbg("info", "GitHub Contents 带 Token 响应", {
          ok: second.res.ok,
          status: second.res.status,
          ms: Math.round(dt),
        });
        res = second.res;
        text = second.text;
      }
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          try {
            var rawData = await loadJsonViaRawPublic(g);
            logDbg("info", "loadJson 成功(raw 兜底)", {
              categories: (rawData.categoryConfig || []).length,
              cameras: (rawData.cameraData || []).length,
            });
            return rawData;
          } catch (rawErr) {
            logDbg("info", "raw 兜底未成功: " + (rawErr.message || String(rawErr)));
          }
        }
        var errMsg = text;
        try {
          errMsg = JSON.parse(text).message || text;
        } catch (e) {}
        if (res.status === 401) {
          errMsg +=
            "（Token 无效/已撤销/已过期，或 Fine-grained 未勾选本仓库与 Contents 读权限；请用 setup-token 检查 PAT）";
        }
        if ((res.status === 404 || res.status === 403) && !g.token) {
          errMsg +=
            " 已尝试 raw.githubusercontent.com 直链仍失败时：请确认仓库为 Public 且分支上存在 data.json；私有库仅本机配置 PAT 可读。";
        }
        throw new Error("读取仓库失败：" + errMsg);
      }
      var meta = JSON.parse(text);
      if (!meta.content) throw new Error("GitHub 返回无 content 字段");
      shaCache = meta.sha;
      var jsonStr = base64ToUtf8(meta.content);
      var data = JSON.parse(jsonStr);
      logDbg("info", "loadJson 成功(GitHub)", {
        categories: (data.categoryConfig || []).length,
        cameras: (data.cameraData || []).length,
      });
      return data;
    } catch (e) {
      logDbg("error", "loadJson 失败: " + (e.message || String(e)), { stack: String(e.stack || "") });
      throw e;
    }
  }

  async function saveJson(dataObj, commitMessage) {
    logDbg("info", "saveJson 开始", { hasSha: !!shaCache });
    try {
      var g = cfg();
      if (g.useLocal) {
        throw new Error("当前为本地预览模式（useLocalDataJson=true），不会写入 GitHub。请改为 false 并部署后使用后台保存。");
      }
      if (!g.owner || !g.repo || !g.token) {
        throw new Error("保存前请在 setup-token.html 写入 PAT，或在 config.js 填写 github.token（勿提交到公开仓库）。");
      }
      var url = apiUrl("contents/" + encodeURIComponent(g.dataPath));
      var body = {
        message: commitMessage || "chore: update data.json",
        content: utf8ToBase64(JSON.stringify(dataObj, null, 2)),
        branch: g.branch,
      };
      if (shaCache) body.sha = shaCache;
      var res = await fetchWithTimeout(
        url,
        {
          method: "PUT",
          headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
          body: JSON.stringify(body),
        },
        60000
      );
      var text = await res.text();
      if (!res.ok) {
        var errMsg = text;
        try {
          errMsg = JSON.parse(text).message || text;
        } catch (e) {}
        throw new Error("写入仓库失败：" + errMsg);
      }
      var out = JSON.parse(text);
      if (out.content && out.content.sha) shaCache = out.content.sha;
      logDbg("info", "saveJson 成功");
      return out;
    } catch (e) {
      logDbg("error", "saveJson 失败: " + (e.message || String(e)), { stack: String(e.stack || "") });
      throw e;
    }
  }

  function getSha() {
    return shaCache;
  }

  global.GithubStorage = {
    loadJson: loadJson,
    saveJson: saveJson,
    getSha: getSha,
  };
})(window);
