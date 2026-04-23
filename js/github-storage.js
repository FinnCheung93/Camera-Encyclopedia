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

  async function loadContentsOnce(useToken) {
    var g = cfg();
    var url =
      apiUrl("contents/" + encodeURIComponent(g.dataPath)) + "?ref=" + encodeURIComponent(g.branch);
    var res = await fetch(url, { headers: apiHeaders(!!useToken) });
    var text = await res.text();
    return { res: res, text: text };
  }

  async function loadJson() {
    var g = cfg();
    if (g.useLocal) {
      var res = await fetch("./data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("无法读取本地 data.json（HTTP " + res.status + "）");
      shaCache = null;
      return await res.json();
    }
    if (!g.owner || !g.repo) {
      throw new Error("请在 config.js 填写 github.owner 与 github.repo。");
    }

    /**
     * 公开仓库：GitHub Contents API 允许匿名读取（有频率限制），访客浏览前台无需 Token。
     * 私有仓库：匿名会 404，需带 PAT；后台保存始终需要 PAT。
     */
    var first = await loadContentsOnce(false);
    var res = first.res;
    var text = first.text;
    if (!res.ok && g.token) {
      var second = await loadContentsOnce(true);
      res = second.res;
      text = second.text;
    }
    if (!res.ok) {
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
          " 若为私有仓库，匿名无法读取 data.json：请把仓库改为 Public，或在 setup-token.html 配置 PAT（仅你自己浏览器需要，访客仍无法在无 Token 下读私有库）。";
      }
      throw new Error("读取仓库失败：" + errMsg);
    }
    var meta = JSON.parse(text);
    if (!meta.content) throw new Error("GitHub 返回无 content 字段");
    shaCache = meta.sha;
    var jsonStr = base64ToUtf8(meta.content);
    return JSON.parse(jsonStr);
  }

  async function saveJson(dataObj, commitMessage) {
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
    var res = await fetch(url, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify(body),
    });
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
    return out;
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
