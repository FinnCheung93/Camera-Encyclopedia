/**
 * 通过 GitHub Contents API 读写 data.json；本地模式直接 fetch 文件。
 */
(function (global) {
  var shaCache = null;

  function cfg() {
    var c = global.APP_CONFIG || {};
    var g = c.github || {};
    return {
      owner: g.owner,
      repo: g.repo,
      token: g.token,
      branch: g.branch || "gh-pages",
      dataPath: g.dataPath || "data.json",
      useLocal: !!c.useLocalDataJson,
    };
  }

  function authHeaders() {
    var token = cfg().token;
    var h = { Accept: "application/vnd.github+json" };
    if (token && token !== "YOUR_GITHUB_PAT") h.Authorization = "Bearer " + token;
    return h;
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

  async function loadJson() {
    var g = cfg();
    if (g.useLocal) {
      var res = await fetch("./data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("无法读取本地 data.json（HTTP " + res.status + "）");
      shaCache = null;
      return await res.json();
    }
    if (!g.owner || !g.repo || !g.token || g.token === "YOUR_GITHUB_PAT") {
      throw new Error("请在 config.js 填写 github.owner / repo / token，或开启 useLocalDataJson");
    }
    var url =
      apiUrl("contents/" + encodeURIComponent(g.dataPath)) + "?ref=" + encodeURIComponent(g.branch);
    var res = await fetch(url, { headers: authHeaders() });
    var text = await res.text();
    if (!res.ok) {
      var errMsg = text;
      try {
        errMsg = JSON.parse(text).message || text;
      } catch (e) {}
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
    if (!g.owner || !g.repo || !g.token || g.token === "YOUR_GITHUB_PAT") {
      throw new Error("保存前请在 config.js 填写有效的 github.token");
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
