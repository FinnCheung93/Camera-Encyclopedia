/** 首页：总览、最近更新、分类入口、全站搜索 */
(function () {
  var app = AppUtils.$("#app");
  var footer = AppUtils.$("#footer");
  var navMount = AppUtils.$("#navMount");

  function distinctBrands(list) {
    var s = {};
    list.forEach(function (c) {
      if (c.brand) s[c.brand] = true;
    });
    return Object.keys(s).length;
  }

  function recentCameras(db, n) {
    var arr = (db.cameraData || []).slice();
    arr.sort(function (a, b) {
      return String(b.updateTime || "").localeCompare(String(a.updateTime || ""));
    });
    return arr.slice(0, n || 6);
  }

  function searchAll(db, q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return [];
    return (db.cameraData || []).filter(function (c) {
      var hay = (c.brand + " " + c.model).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function render(db) {
    SiteNav.mountNav(navMount, { db: db, current: "home" });
    var site = db.siteConfig || {};
    var cams = db.cameraData || [];
    var cats = (db.categoryConfig || []).filter(function (c) {
      return c.status === "enable";
    });
    cats.sort(function (a, b) {
      return (a.sort || 0) - (b.sort || 0);
    });

    var rec = recentCameras(db, 6);
    var recHtml = rec
      .map(function (c) {
        var img = c.image
          ? '<img class="card-img" loading="lazy" src="' + AppUtils.escapeHtml(c.image) + '" alt="" />'
          : '<div class="card-img"></div>';
        return (
          '<article class="card" data-href="list.html?category=' +
          encodeURIComponent(c.categoryId) +
          '">' +
          img +
          '<div class="card-body">' +
          "<div><strong>" +
          AppUtils.escapeHtml(c.brand || "") +
          " " +
          AppUtils.escapeHtml(c.model || "") +
          "</strong></div>" +
          '<div class="muted">发布年份：' +
          AppUtils.escapeHtml(String(c.year || "")) +
          " · 更新：" +
          AppUtils.escapeHtml(String(c.updateTime || "")) +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    var catCards = cats
      .map(function (cat) {
        var count = cams.filter(function (x) {
          return x.categoryId === cat.categoryId;
        }).length;
        return (
          '<article class="card" data-href="list.html?category=' +
          encodeURIComponent(cat.categoryId) +
          '">' +
          '<div class="card-img" style="display:flex;align-items:center;justify-content:center;color:#7d8794;font-weight:700;">' +
          AppUtils.escapeHtml(String(count)) +
          " 台</div>" +
          '<div class="card-body">' +
          "<div><strong>" +
          AppUtils.escapeHtml(cat.categoryName) +
          "</strong></div>" +
          '<div class="muted">进入该分类列表</div>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    app.innerHTML =
      '<section class="hero">' +
      '<div class="panel">' +
      "<h1 style=\"margin:0 0 8px;font-size:22px;\">" +
      AppUtils.escapeHtml(site.siteTitle || "相机图鉴") +
      "</h1>" +
      '<p class="muted" style="margin:0 0 12px;">' +
      AppUtils.escapeHtml(site.siteDesc || "") +
      "</p>" +
      '<p style="margin:0;" class="muted">署名：' +
      AppUtils.escapeHtml(site.author || "") +
      "</p>" +
      '<div class="stats">' +
      '<span class="stat-pill">已收录机型：' +
      cams.length +
      " 台</span>" +
      '<span class="stat-pill">覆盖品牌：' +
      distinctBrands(cams) +
      " 个</span>" +
      "</div>" +
      "</div>" +
      '<div class="panel">' +
      '<div class="section-title" style="font-size:16px;">全局搜索</div>' +
      '<div class="row" style="margin-bottom:10px;">' +
      '<input class="input" id="globalSearch" placeholder="输入品牌或机型关键词" style="max-width:none;flex:1;min-width:200px;" />' +
      "</div>" +
      '<div id="searchResults" class="muted">在上方输入并回车，将在下方显示匹配机型。</div>' +
      "</div>" +
      "</section>" +
      '<section style="margin-bottom:28px;">' +
      '<h2 class="section-title">最近更新</h2>' +
      '<div class="grid-cards" id="recentGrid">' +
      (recHtml || '<div class="empty">暂无机型数据</div>') +
      "</div>" +
      "</section>" +
      "<section>" +
      '<h2 class="section-title">分类入口</h2>' +
      '<div class="grid-cards">' +
      (catCards || '<div class="empty">暂无启用分类</div>') +
      "</div>" +
      "</section>";

    AppUtils.$all(".card[data-href]").forEach(function (el) {
      el.addEventListener("click", function () {
        location.href = el.getAttribute("data-href");
      });
    });

    var inp = AppUtils.$("#globalSearch");
    var sr = AppUtils.$("#searchResults");
    function runSearch() {
      var list = searchAll(db, inp.value);
      if (!inp.value.trim()) {
        sr.className = "muted";
        sr.textContent = "在上方输入并回车，将在下方显示匹配机型。";
        return;
      }
      if (!list.length) {
        sr.className = "empty";
        sr.textContent = "没有匹配的机型。";
        return;
      }
      sr.className = "";
      sr.innerHTML =
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>品牌</th><th>机型</th><th>分类</th><th>操作</th></tr></thead><tbody>' +
        list
          .map(function (c) {
            var cat = (db.categoryConfig || []).find(function (x) {
              return x.categoryId === c.categoryId;
            });
            return (
              "<tr><td>" +
              AppUtils.escapeHtml(c.brand || "") +
              "</td><td>" +
              AppUtils.escapeHtml(c.model || "") +
              "</td><td>" +
              AppUtils.escapeHtml((cat && cat.categoryName) || c.categoryId) +
              '</td><td><a class="btn btn-ghost" href="list.html?category=' +
              encodeURIComponent(c.categoryId) +
              '">去列表</a></td></tr>'
            );
          })
          .join("") +
        "</tbody></table></div>";
    }
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") runSearch();
    });

    var siteTime = "";
    try {
      siteTime = new Date(document.lastModified).toISOString().slice(0, 10);
    } catch (e) {}
    footer.textContent = "网站文件更新时间：" + siteTime;
  }

  async function boot() {
    try {
      var db = await GithubStorage.loadJson();
      render(db);
    } catch (e) {
      app.innerHTML = '<div class="empty">加载失败：' + AppUtils.escapeHtml(e.message || String(e)) + "</div>";
      AppUtils.toast(e.message || String(e), "error");
    }
  }

  boot();
})();
