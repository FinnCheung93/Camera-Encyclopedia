/** 首页：站点介绍 + 分类入口（居中简化布局） */
(function () {
  var app = AppUtils.$("#app");

  function render(db) {
    var site = db.siteConfig || {};
    var cams = db.cameraData || [];
    var cats = (db.categoryConfig || []).filter(function (c) {
      return c.status === "enable";
    });
    cats.sort(function (a, b) {
      return (a.sort || 0) - (b.sort || 0);
    });

    var catTiles = cats
      .map(function (cat, i) {
        var count = cams.filter(function (x) {
          return x.categoryId === cat.categoryId;
        }).length;
        var mod = i % 3;
        return (
          '<a class="category-tile category-tile--' +
          mod +
          '" href="list.html?category=' +
          encodeURIComponent(cat.categoryId) +
          '">' +
          '<span class="category-tile-glow" aria-hidden="true"></span>' +
          '<span class="category-tile-name">' +
          AppUtils.escapeHtml(cat.categoryName) +
          "</span>" +
          '<span class="category-tile-meta">' +
          count +
          " 台收录 · 浏览列表</span>" +
          "</a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="home-shell">' +
      '<div class="home-inner">' +
      '<header class="home-intro">' +
      "<h1 class=\"home-title\">" +
      AppUtils.escapeHtml(site.siteTitle || "相机图鉴") +
      "</h1>" +
      '<p class="home-desc">' +
      AppUtils.escapeHtml(site.siteDesc || "") +
      "</p>" +
      "</header>" +
      '<div class="category-showcase">' +
      (catTiles || '<div class="empty">暂无启用分类</div>') +
      "</div>" +
      "</div>" +
      "</div>";
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
