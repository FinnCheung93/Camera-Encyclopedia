/** 通用分类列表：筛选 / 排序 / 卡片表格视图 / 懒加载 */
(function () {
  var app = AppUtils.$("#app");
  var footer = AppUtils.$("#footer");
  var navMount = AppUtils.$("#navMount");

  function getCategory(db, id) {
    return (db.categoryConfig || []).find(function (c) {
      return c.categoryId === id;
    });
  }

  function camerasInCategory(db, id) {
    return (db.cameraData || []).filter(function (c) {
      return c.categoryId === id;
    });
  }

  function brandsInList(list) {
    var m = {};
    list.forEach(function (c) {
      if (c.brand) m[c.brand] = true;
    });
    return Object.keys(m).sort(function (a, b) {
      return a.localeCompare(b, "zh-Hans-CN");
    });
  }

  function sortCameras(list, mode) {
    var out = list.slice();
    if (mode === "yearAsc") {
      out.sort(function (a, b) {
        return (Number(a.year) || 0) - (Number(b.year) || 0);
      });
    } else if (mode === "yearDesc") {
      out.sort(function (a, b) {
        return (Number(b.year) || 0) - (Number(a.year) || 0);
      });
    } else if (mode === "updatedDesc") {
      out.sort(function (a, b) {
        return String(b.updateTime || "").localeCompare(String(a.updateTime || ""));
      });
    } else if (mode === "brandAsc") {
      out.sort(function (a, b) {
        var ba = (a.brand || "").localeCompare(b.brand || "", "zh-Hans-CN");
        if (ba !== 0) return ba;
        return (a.model || "").localeCompare(b.model || "", "zh-Hans-CN");
      });
    }
    return out;
  }

  function matchFilters(cam, cat, state) {
    if (state.second.size && !state.second.has(String(cam.secondCategory || ""))) return false;
    if (state.brands.size && !state.brands.has(String(cam.brand || ""))) return false;

    for (var i = 0; i < cat.fieldConfig.length; i++) {
      var f = cat.fieldConfig[i];
      if (!f.isFilter) continue;
      var val = AppUtils.getCamField(cam, f.fieldId);
      if (f.fieldType === "number") {
        var n = Number(val);
        var r = state.numRange[f.fieldId];
        if (r) {
          if (r.min !== "" && !isNaN(Number(r.min)) && !(n >= Number(r.min))) return false;
          if (r.max !== "" && !isNaN(Number(r.max)) && !(n <= Number(r.max))) return false;
        }
      } else if (f.fieldType === "select") {
        var set = state.selectSet[f.fieldId];
        if (set && set.size) {
          if (!set.has(String(val || ""))) return false;
        }
      } else {
        var q = (state.textQ[f.fieldId] || "").trim().toLowerCase();
        if (q && String(val || "").toLowerCase().indexOf(q) < 0) return false;
      }
    }
    return true;
  }

  function remarkPreview(s) {
    s = String(s || "");
    if (s.length <= 80) return s;
    return s.slice(0, 80) + "…";
  }

  function tagsForCard(cam, cat) {
    var tags = [];
    cat.fieldConfig.forEach(function (f) {
      if (["brand", "model", "year", "secondCategory", "image", "remark"].indexOf(f.fieldId) >= 0) return;
      var v = AppUtils.getCamField(cam, f.fieldId);
      if (v === undefined || v === null || v === "") return;
      tags.push('<span class="tag">' + AppUtils.escapeHtml(f.fieldName) + "：" + AppUtils.escapeHtml(String(v)) + "</span>");
    });
    return tags.join("");
  }

  function renderTable(cam, cat) {
    var cells = cat.fieldConfig.map(function (f) {
      var v = AppUtils.getCamField(cam, f.fieldId);
      return "<td>" + AppUtils.escapeHtml(v === undefined || v === null ? "" : String(v)) + "</td>";
    });
    return "<tr>" + cells.join("") + "</tr>";
  }

  function renderCard(cam, cat) {
    var img = cam.image
      ? '<img class="card-img" loading="lazy" decoding="async" src="' + AppUtils.escapeHtml(cam.image) + '" alt="" />'
      : '<div class="card-img"></div>';
    return (
      '<article class="card" style="cursor:default;">' +
      img +
      '<div class="card-body">' +
      "<div><strong>" +
      AppUtils.escapeHtml(cam.brand || "") +
      " " +
      AppUtils.escapeHtml(cam.model || "") +
      "</strong></div>" +
      '<div class="muted">发布年份：' +
      AppUtils.escapeHtml(String(cam.year || "")) +
      " · 二级品类：" +
      AppUtils.escapeHtml(String(cam.secondCategory || "")) +
      "</div>" +
      '<div class="tag-row">' +
      tagsForCard(cam, cat) +
      "</div>" +
      '<p class="muted" style="margin:8px 0 0;font-size:13px;">' +
      AppUtils.escapeHtml(remarkPreview(cam.remark)) +
      "</p>" +
      "</div>" +
      "</article>"
    );
  }

  function emptyState() {
    return '<div class="empty">没有符合条件的机型，尝试调整筛选或排序。</div>';
  }

  function mount(db) {
    var params = AppUtils.parseParams();
    var categoryId = params.category || "";
    var cat = getCategory(db, categoryId);
    if (!cat || cat.status !== "enable") {
      app.innerHTML =
        '<div class="empty">分类不存在或未启用。请从<a href="index.html">首页</a>进入。</div>';
      return;
    }

    if (!Array.isArray(cat.fieldConfig)) {
      cat.fieldConfig = [];
    }
    var secondCategoryValues = Array.isArray(cat.secondCategory)
      ? cat.secondCategory
      : cat.secondCategory != null && String(cat.secondCategory).trim() !== ""
      ? [String(cat.secondCategory).trim()]
      : [];

    if (typeof SiteNav !== "undefined" && SiteNav.mountNav) {
      SiteNav.mountNav(navMount, { db: db, current: "cat-" + cat.categoryId });
    }

    var baseList = camerasInCategory(db, cat.categoryId);
    var site = db.siteConfig || {};
    var defaultView = site.defaultView === "table" ? "table" : "card";

    var state = {
      view: defaultView,
      sort: "yearDesc",
      second: new Set(),
      brands: new Set(),
      numRange: {},
      selectSet: {},
      textQ: {},
    };

    cat.fieldConfig.forEach(function (f) {
      if (!f.isFilter) return;
      if (f.fieldType === "number") state.numRange[f.fieldId] = { min: "", max: "" };
      if (f.fieldType === "select") state.selectSet[f.fieldId] = new Set();
      if (f.fieldType === "text" || f.fieldType === "textarea") state.textQ[f.fieldId] = "";
    });

    function chipsHtml(fieldKey, values, label) {
      return values
        .map(function (v) {
          var on = state[fieldKey].has(v) ? " on" : "";
          return (
            '<span class="chip' +
            on +
            '" data-field="' +
            fieldKey +
            '" data-val="' +
            AppUtils.escapeHtml(v) +
            '">' +
            AppUtils.escapeHtml(v) +
            "</span>"
          );
        })
        .join("");
    }

    function selectFilterChips(f) {
      var set = state.selectSet[f.fieldId];
      return (f.options || [])
        .map(function (v) {
          var on = set.has(v) ? " on" : "";
          return (
            '<span class="chip' +
            on +
            '" data-sel-field="' +
            AppUtils.escapeHtml(f.fieldId) +
            '" data-val="' +
            AppUtils.escapeHtml(v) +
            '">' +
            AppUtils.escapeHtml(v) +
            "</span>"
          );
        })
        .join("");
    }

    function filterBlocks() {
      var blocks = [];
      blocks.push(
        '<div class="filter-block"><h4>二级品类（多选）</h4><div class="chips" id="chip-second">' +
          chipsHtml("second", secondCategoryValues, "second") +
          "</div></div>"
      );
      blocks.push(
        '<div class="filter-block"><h4>品牌（多选）</h4><div class="chips" id="chip-brand">' +
          chipsHtml("brands", brandsInList(baseList), "brands") +
          "</div></div>"
      );

      cat.fieldConfig.forEach(function (f) {
        if (!f.isFilter) return;
        if (f.fieldId === "secondCategory") return;
        if (f.fieldType === "number") {
          var r = state.numRange[f.fieldId];
          blocks.push(
            '<div class="filter-block"><h4>' +
              AppUtils.escapeHtml(f.fieldName) +
              "（区间）</h4>" +
              '<div class="range-row">' +
              '<input class="input" style="max-width:140px" data-num-min="' +
              AppUtils.escapeHtml(f.fieldId) +
              '" placeholder="最小" />' +
              "<span class=\"muted\">~</span>" +
              '<input class="input" style="max-width:140px" data-num-max="' +
              AppUtils.escapeHtml(f.fieldId) +
              '" placeholder="最大" />' +
              "</div></div>"
          );
        } else if (f.fieldType === "select") {
          blocks.push(
            '<div class="filter-block"><h4>' +
              AppUtils.escapeHtml(f.fieldName) +
              "（多选）</h4><div class="chips" data-sel-block="' +
              AppUtils.escapeHtml(f.fieldId) +
              '">' +
              selectFilterChips(f) +
              "</div></div>"
          );
        } else if (f.fieldType === "text" || f.fieldType === "textarea") {
          blocks.push(
            '<div class="filter-block"><h4>' +
              AppUtils.escapeHtml(f.fieldName) +
              "（包含）</h4>" +
              '<input class="input" style="max-width:none" data-text-field="' +
              AppUtils.escapeHtml(f.fieldId) +
              '" placeholder="输入关键词" />' +
              "</div></div>"
          );
        }
      });

      return blocks.join("");
    }

    function paint() {
      var filterState = {
        second: state.second,
        brands: state.brands,
        numRange: state.numRange,
        selectSet: state.selectSet,
        textQ: state.textQ,
      };
      var filtered = baseList.filter(function (c) {
        return matchFilters(c, cat, filterState);
      });
      var sorted = sortCameras(filtered, state.sort);

      AppUtils.$("#viewCard").className = "btn" + (state.view === "card" ? " btn-primary" : "");
      AppUtils.$("#viewTable").className = "btn" + (state.view === "table" ? " btn-primary" : "");
      AppUtils.$("#sortSelect").value = state.sort;

      var mountList = AppUtils.$("#listMount");
      if (!sorted.length) {
        mountList.innerHTML = emptyState();
        return;
      }
      if (state.view === "card") {
        mountList.innerHTML = '<div class="grid-cards">' + sorted.map(function (c) {
          return renderCard(c, cat);
        }).join("") + "</div>";
      } else {
        var head = cat.fieldConfig
          .map(function (f) {
            return "<th>" + AppUtils.escapeHtml(f.fieldName) + "</th>";
          })
          .join("");
        mountList.innerHTML =
          '<div class="table-wrap"><table class="data-table"><thead><tr>' +
          head +
          "</tr></thead><tbody>" +
          sorted.map(function (c) {
            return renderTable(c, cat);
          }).join("") +
          "</tbody></table></div>";
      }
    }

    app.innerHTML =
      '<div class="controls">' +
      '<div style="flex:1;min-width:220px;">' +
      "<h1 style=\"margin:0;font-size:20px;\">" +
      AppUtils.escapeHtml(cat.categoryName) +
      "</h1>" +
      '<p class="muted" style="margin:4px 0 0;">共 ' +
      baseList.length +
      " 台（筛选结果实时更新）</p>" +
      "</div>" +
      '<div class="row">' +
      '<button type="button" class="btn btn-primary" id="viewCard">卡片视图</button>' +
      '<button type="button" class="btn" id="viewTable">表格视图</button>' +
      '<select class="select" id="sortSelect" style="max-width:260px;width:auto;">' +
      '<option value="yearDesc">按发布年份倒序</option>' +
      '<option value="yearAsc">按发布年份正序</option>' +
      '<option value="updatedDesc">按更新时间倒序</option>' +
      '<option value="brandAsc">按品牌首字母正序</option>' +
      "</select>" +
      '<button type="button" class="btn" id="resetFilters">重置筛选</button>' +
      "</div>" +
      "</div>" +
      '<section class="filters">' +
      filterBlocks() +
      "</section>" +
      '<div id="listMount"></div>';

    cat.fieldConfig.forEach(function (f) {
      if (!f.isFilter || f.fieldType !== "number") return;
      var mn = AppUtils.$('[data-num-min="' + f.fieldId + '"]');
      var mx = AppUtils.$('[data-num-max="' + f.fieldId + '"]');
      if (mn) mn.value = state.numRange[f.fieldId].min;
      if (mx) mx.value = state.numRange[f.fieldId].max;
    });
    cat.fieldConfig.forEach(function (f) {
      if (!f.isFilter) return;
      if (f.fieldType === "text" || f.fieldType === "textarea") {
        var el = AppUtils.$('[data-text-field="' + f.fieldId + '"]');
        if (el) el.value = state.textQ[f.fieldId] || "";
      }
    });

    function wire() {
      AppUtils.$("#viewCard").addEventListener("click", function () {
        state.view = "card";
        paint();
      });
      AppUtils.$("#viewTable").addEventListener("click", function () {
        state.view = "table";
        paint();
      });
      AppUtils.$("#sortSelect").addEventListener("change", function () {
        state.sort = AppUtils.$("#sortSelect").value;
        paint();
      });
      AppUtils.$("#resetFilters").addEventListener("click", function () {
        state.second = new Set();
        state.brands = new Set();
        cat.fieldConfig.forEach(function (f) {
          if (!f.isFilter) return;
          if (f.fieldType === "number") state.numRange[f.fieldId] = { min: "", max: "" };
          if (f.fieldType === "select") state.selectSet[f.fieldId] = new Set();
          if (f.fieldType === "text" || f.fieldType === "textarea") state.textQ[f.fieldId] = "";
        });
        AppUtils.$all(".chip.on").forEach(function (el) {
          el.classList.remove("on");
        });
        AppUtils.$all("[data-num-min],[data-num-max]").forEach(function (el) {
          el.value = "";
        });
        AppUtils.$all("[data-text-field]").forEach(function (el) {
          el.value = "";
        });
        paint();
      });

      AppUtils.$all("#chip-second .chip").forEach(function (el) {
        el.addEventListener("click", function () {
          var v = el.getAttribute("data-val");
          if (state.second.has(v)) state.second.delete(v);
          else state.second.add(v);
          el.classList.toggle("on");
          paint();
        });
      });
      AppUtils.$all("#chip-brand .chip").forEach(function (el) {
        el.addEventListener("click", function () {
          var v = el.getAttribute("data-val");
          if (state.brands.has(v)) state.brands.delete(v);
          else state.brands.add(v);
          el.classList.toggle("on");
          paint();
        });
      });

      AppUtils.$all(".chip[data-sel-field]").forEach(function (el) {
        el.addEventListener("click", function () {
          var fid = el.getAttribute("data-sel-field");
          var v = el.getAttribute("data-val");
          var set = state.selectSet[fid];
          if (set.has(v)) set.delete(v);
          else set.add(v);
          el.classList.toggle("on");
          paint();
        });
      });

      AppUtils.$all("[data-num-min],[data-num-max]").forEach(function (el) {
        el.addEventListener("input", function () {
          var fid = el.getAttribute("data-num-min") || el.getAttribute("data-num-max");
          if (!state.numRange[fid]) state.numRange[fid] = { min: "", max: "" };
          if (el.hasAttribute("data-num-min")) state.numRange[fid].min = el.value;
          if (el.hasAttribute("data-num-max")) state.numRange[fid].max = el.value;
          paint();
        });
      });

      AppUtils.$all("[data-text-field]").forEach(function (el) {
        el.addEventListener("input", function () {
          var fid = el.getAttribute("data-text-field");
          state.textQ[fid] = el.value;
          paint();
        });
      });
    }

    wire();
    paint();

    if (footer) {
      try {
        var siteTime = new Date(document.lastModified).toISOString().slice(0, 10);
        footer.innerHTML =
          "网站文件更新时间：" +
          AppUtils.escapeHtml(siteTime) +
          ' · <a href="setup-token.html">PAT 本机设置</a>';
      } catch (e) {
        footer.textContent = "";
      }
    }
  }

  async function boot() {
    try {
      var db = await GithubStorage.loadJson();
      mount(db);
    } catch (e) {
      app.innerHTML = '<div class="empty">加载失败：' + AppUtils.escapeHtml(e.message || String(e)) + "</div>";
      AppUtils.toast(e.message || String(e), "error");
    }
  }

  boot();
})();
