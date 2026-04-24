/** 顶部导航渲染（前台页共用） */
(function (global) {
  function renderNav(opts) {
    var db = opts.db;
    var current = opts.current || "home";
    var site = db.siteConfig || {};
    var title = site.siteTitle || "相机图鉴";
    var cats = (db.categoryConfig || [])
      .filter(function (c) {
        return c.status === "enable";
      })
      .sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0);
      });

    var links = cats
      .map(function (c) {
        var cls = current === "cat-" + c.categoryId ? " active" : "";
        return (
          '<a class="' +
          cls.trim() +
          '" href="list.html?category=' +
          encodeURIComponent(c.categoryId) +
          '">' +
          AppUtils.escapeHtml(c.categoryName) +
          "</a>"
        );
      })
      .join("");

    return (
      '<header class="site-header">' +
      '<div class="site-header-inner">' +
      '<a class="brand" href="index.html">' +
      AppUtils.escapeHtml(title) +
      "</a>" +
      '<nav class="nav-desktop">' +
      '<a class="' +
      (current === "home" ? "active" : "") +
      '" href="index.html">首页</a>' +
      links +
      '<a href="admin-login.html">后台</a>' +
      "</nav>" +
      '<button class="nav-toggle" type="button" aria-label="打开菜单">菜单</button>' +
      "</div>" +
      '<div class="nav-mobile" id="navMobile">' +
      '<a class="' +
      (current === "home" ? "active" : "") +
      '" href="index.html">首页</a>' +
      cats
        .map(function (c) {
          var cls = current === "cat-" + c.categoryId ? "active" : "";
          return (
            '<a class="' +
            cls +
            '" href="list.html?category=' +
            encodeURIComponent(c.categoryId) +
            '">' +
            AppUtils.escapeHtml(c.categoryName) +
            "</a>"
          );
        })
        .join("") +
      '<a href="admin-login.html">后台</a>' +
      "</div>" +
      "</header>"
    );
  }

  function mountNav(container, opts) {
    if (!container) return;
    container.innerHTML = renderNav(opts);
    var btn = AppUtils.$(".nav-toggle", container);
    var mobile = AppUtils.$("#navMobile", container);
    if (btn && mobile) {
      btn.addEventListener("click", function () {
        mobile.classList.toggle("open");
      });
    }
  }

  global.SiteNav = { renderNav: renderNav, mountNav: mountNav };
})(window);
