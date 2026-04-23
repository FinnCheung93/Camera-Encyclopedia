/** 后台管理：配置 / 分类 / 字段 / 相机 / 导入 / 备份恢复 */
(function () {
  if (sessionStorage.getItem("ADM_AUTH") !== "1") {
    location.href = "admin-login.html";
    return;
  }

  var DB = null;
  var activeSection = "site";
  var modalCtx = null;

  var navMount = AppUtils.$("#adminNav");
  var panel = AppUtils.$("#adminPanel");
  var mask = AppUtils.$("#modalMask");
  var modalBody = AppUtils.$("#modalBody");
  var modalTitle = AppUtils.$("#modalTitle");
  var modalSave = AppUtils.$("#modalSave");
  var modalClose = AppUtils.$("#modalClose");

  AppUtils.$("#btnLogout").addEventListener("click", function () {
    sessionStorage.removeItem("ADM_AUTH");
    location.href = "admin-login.html";
  });

  function openModal(title, html, onSave, afterRender) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    if (afterRender) afterRender();
    mask.style.display = "block";
    modalCtx = { onSave: onSave };
  }

  function closeModal() {
    mask.style.display = "none";
    modalCtx = null;
  }

  modalClose.addEventListener("click", closeModal);
  mask.addEventListener("click", function (e) {
    if (e.target === mask) closeModal();
  });
  modalSave.addEventListener("click", async function () {
    if (!modalCtx || !modalCtx.onSave) return;
    try {
      await modalCtx.onSave();
      closeModal();
      renderAll();
    } catch (e) {
      AppUtils.toast(e.message || String(e), "error");
    }
  });

  async function persist(message) {
    await GithubStorage.saveJson(DB, message || "chore: update data.json via admin");
    AppUtils.toast("已保存到仓库");
  }

  function sortedCategories() {
    return (DB.categoryConfig || []).slice().sort(function (a, b) {
      return (a.sort || 0) - (b.sort || 0);
    });
  }

  function camerasOf(catId) {
    return (DB.cameraData || []).filter(function (c) {
      return c.categoryId === catId;
    });
  }

  function nextCameraId() {
    var max = 0;
    (DB.cameraData || []).forEach(function (c) {
      if (Number(c.id) > max) max = Number(c.id);
    });
    return max + 1;
  }

  function slugId() {
    return "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function renderNav() {
    var tabs = [
      { id: "site", label: "网站基础配置" },
      { id: "cats", label: "一级大类型" },
      { id: "fields", label: "字段与筛选" },
      { id: "cameras", label: "相机数据" },
      { id: "import", label: "批量导入" },
      { id: "backup", label: "备份与恢复" },
    ];
    navMount.innerHTML = tabs
      .map(function (t) {
        return (
          '<button type="button" data-tab="' +
          t.id +
          '" class="' +
          (activeSection === t.id ? "active" : "") +
          '">' +
          t.label +
          "</button>"
        );
      })
      .join("");
    AppUtils.$all("button[data-tab]", navMount).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeSection = btn.getAttribute("data-tab");
        renderAll();
      });
    });
  }

  function renderSite() {
    var s = DB.siteConfig || {};
    var gh = s.githubConfig || {};
    panel.innerHTML =
      '<div class="section-title">网站基础配置</div>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label>网站标题</label><input class="input" id="siteTitle" style="max-width:none" /></div>' +
      '<div class="form-field"><label>一句话介绍</label><input class="input" id="siteDesc" style="max-width:none" /></div>' +
      '<div class="form-field"><label>个人署名</label><input class="input" id="author" style="max-width:none" /></div>' +
      '<div class="form-field"><label>列表默认视图</label><select class="select" id="defaultView" style="max-width:none"><option value="card">卡片</option><option value="table">表格</option></select></div>' +
      '<div class="form-field"><label>后台登录密码（写入 data.json）</label><input class="input" id="password" type="text" style="max-width:none" /></div>' +
      "</div>" +
      '<p class="muted" style="margin:12px 0 8px;">GitHub 仓库信息（写入 data.json；Token 仍在 config.js 维护更安全）</p>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label>owner</label><input class="input" id="ghOwner" style="max-width:none" /></div>' +
      '<div class="form-field"><label>repo</label><input class="input" id="ghRepo" style="max-width:none" /></div>' +
      '<div class="form-field"><label>branch</label><input class="input" id="ghBranch" style="max-width:none" /></div>' +
      "</div>" +
      '<div class="row" style="margin-top:14px;">' +
      '<button class="btn btn-primary" type="button" id="saveSite">保存配置</button>' +
      "</div>";

    AppUtils.$("#siteTitle").value = s.siteTitle || "";
    AppUtils.$("#siteDesc").value = s.siteDesc || "";
    AppUtils.$("#author").value = s.author || "";
    AppUtils.$("#defaultView").value = s.defaultView === "table" ? "table" : "card";
    AppUtils.$("#password").value = s.password || "";
    AppUtils.$("#ghOwner").value = gh.owner || "";
    AppUtils.$("#ghRepo").value = gh.repo || "";
    AppUtils.$("#ghBranch").value = gh.branch || "gh-pages";

    AppUtils.$("#saveSite").addEventListener("click", async function () {
      DB.siteConfig = DB.siteConfig || {};
      DB.siteConfig.siteTitle = AppUtils.$("#siteTitle").value;
      DB.siteConfig.siteDesc = AppUtils.$("#siteDesc").value;
      DB.siteConfig.author = AppUtils.$("#author").value;
      DB.siteConfig.defaultView = AppUtils.$("#defaultView").value;
      DB.siteConfig.password = AppUtils.$("#password").value;
      DB.siteConfig.githubConfig = {
        owner: AppUtils.$("#ghOwner").value.trim(),
        repo: AppUtils.$("#ghRepo").value.trim(),
        branch: AppUtils.$("#ghBranch").value.trim() || "gh-pages",
      };
      try {
        await persist("admin: update site config");
      } catch (e) {
        AppUtils.toast(e.message || String(e), "error");
      }
    });
  }

  function renderCategories() {
    var rows = sortedCategories()
      .map(function (c, idx) {
        return (
          "<tr draggable=\"true\" data-id=\"" +
          AppUtils.escapeHtml(c.categoryId) +
          "\">" +
          "<td><span class=\"drag-handle\">≡</span> " +
          AppUtils.escapeHtml(c.categoryName) +
          "</td>" +
          "<td>" +
          AppUtils.escapeHtml(String(c.sort || idx + 1)) +
          "</td>" +
          "<td>" +
          AppUtils.escapeHtml(c.status || "enable") +
          "</td>" +
          "<td>" +
          camerasOf(c.categoryId).length +
          "</td>" +
          '<td class="row">' +
          '<button class="btn" type="button" data-edit-cat="' +
          AppUtils.escapeHtml(c.categoryId) +
          '">编辑</button>' +
          '<button class="btn" type="button" data-del-cat="' +
          AppUtils.escapeHtml(c.categoryId) +
          '">删除</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    panel.innerHTML =
      '<div class="section-title">一级大类型</div>' +
      '<p class="muted">拖拽左侧手柄调整顺序；保存后写入 sort 字段。</p>' +
      '<table class="data-table" style="margin-bottom:12px;"><thead><tr><th>名称</th><th>排序</th><th>状态</th><th>机型数</th><th>操作</th></tr></thead><tbody id="catBody">' +
      (rows || "") +
      "</tbody></table>" +
      '<div class="row" style="margin-bottom:10px;">' +
      '<input class="input" id="newCatName" placeholder="新分类名称" style="max-width:240px" />' +
      '<button class="btn btn-primary" type="button" id="addCat">新增分类</button>' +
      '<button class="btn" type="button" id="saveCats">保存分类变更</button>' +
      "</div>";

    wireDragCategories();

    AppUtils.$("#addCat").addEventListener("click", function () {
      var name = AppUtils.$("#newCatName").value.trim();
      if (!name) return AppUtils.toast("请输入名称", "error");
      var id = slugId();
      var maxSort = Math.max.apply(
        null,
        [0].concat(
          (DB.categoryConfig || []).map(function (x) {
            return Number(x.sort) || 0;
          })
        )
      );
      DB.categoryConfig = DB.categoryConfig || [];
      DB.categoryConfig.push({
        categoryId: id,
        categoryName: name,
        sort: maxSort + 1,
        status: "enable",
        secondCategory: [],
        fieldConfig: [],
      });
      AppUtils.$("#newCatName").value = "";
      renderAll();
    });

    AppUtils.$all("[data-edit-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-edit-cat");
        var cat = DB.categoryConfig.find(function (x) {
          return x.categoryId === id;
        });
        if (!cat) return;
        openModal(
          "编辑分类",
          buildCatForm(cat),
          async function () {
            cat.categoryName = AppUtils.$("#m_catName").value.trim();
            cat.sort = Number(AppUtils.$("#m_catSort").value) || 1;
            cat.status = AppUtils.$("#m_catStatus").value;
            await persist("admin: edit category " + id);
          },
          function () {
            AppUtils.$("#m_catName").value = cat.categoryName || "";
            AppUtils.$("#m_catSort").value = String(cat.sort || 1);
            AppUtils.$("#m_catStatus").value = cat.status === "disable" ? "disable" : "enable";
          }
        );
      });
    });

    AppUtils.$all("[data-del-cat]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-del-cat");
        if (camerasOf(id).length) {
          AppUtils.toast("该分类下仍有机型，无法删除", "error");
          return;
        }
        DB.categoryConfig = (DB.categoryConfig || []).filter(function (x) {
          return x.categoryId !== id;
        });
        try {
          await persist("admin: delete category " + id);
          renderAll();
        } catch (e) {
          AppUtils.toast(e.message || String(e), "error");
        }
      });
    });

    AppUtils.$("#saveCats").addEventListener("click", async function () {
      try {
        await persist("admin: reorder categories");
        renderAll();
      } catch (e) {
        AppUtils.toast(e.message || String(e), "error");
      }
    });
  }

  function buildCatForm(cat) {
    return (
      '<div class="form-field"><label>名称</label><input class="input" id="m_catName" style="max-width:none" /></div>' +
      '<div class="form-field"><label>排序序号</label><input class="input" id="m_catSort" type="number" style="max-width:none" /></div>' +
      '<div class="form-field"><label>状态</label><select class="select" id="m_catStatus" style="max-width:none"><option value="enable">启用</option><option value="disable">禁用</option></select></div>'
    );
  }

  var dragCatId = null;
  function wireDragCategories() {
    var tbody = AppUtils.$("#catBody");
    if (!tbody) return;
    AppUtils.$all("tr[draggable]", tbody).forEach(function (tr) {
      tr.addEventListener("dragstart", function () {
        dragCatId = tr.getAttribute("data-id");
      });
      tr.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      tr.addEventListener("drop", function () {
        var targetId = tr.getAttribute("data-id");
        if (!dragCatId || !targetId || dragCatId === targetId) return;
        var list = sortedCategories();
        var from = list.findIndex(function (x) {
          return x.categoryId === dragCatId;
        });
        var to = list.findIndex(function (x) {
          return x.categoryId === targetId;
        });
        if (from < 0 || to < 0) return;
        var moved = list.splice(from, 1)[0];
        list.splice(to, 0, moved);
        list.forEach(function (c, i) {
          c.sort = i + 1;
        });
        renderAll();
      });
    });
  }

  function renderFields() {
    var cats = sortedCategories();
    var opts = cats
      .map(function (c) {
        return (
          '<option value="' +
          AppUtils.escapeHtml(c.categoryId) +
          '">' +
          AppUtils.escapeHtml(c.categoryName) +
          "</option>"
        );
      })
      .join("");
    panel.innerHTML =
      '<div class="section-title">字段与筛选</div>' +
      '<div class="form-field" style="max-width:420px">' +
      "<label>选择一级大类型</label>" +
      '<select class="select" id="fieldCat" style="max-width:none">' +
      opts +
      "</select>" +
      "</div>" +
      '<div class="form-field" style="margin-top:10px;">' +
      "<label>二级品类（每行一个）</label>" +
      '<textarea class="textarea" id="secondLines"></textarea>' +
      "</div>" +
      '<div class="muted" style="margin:8px 0;">字段配置表（fieldId 创建后勿随意修改，以免影响历史数据）</div>' +
      '<div class="table-wrap" style="margin-bottom:10px;"><table class="data-table"><thead><tr><th>fieldId</th><th>名称</th><th>类型</th><th>必填</th><th>筛选</th><th>选项(逗号)</th><th></th></tr></thead><tbody id="fieldRows"></tbody></table></div>' +
      '<div class="row">' +
      '<button class="btn" type="button" id="addFieldRow">新增字段</button>' +
      '<button class="btn btn-primary" type="button" id="saveFields">保存字段配置</button>' +
      "</div>";

    function currentCat() {
      var id = AppUtils.$("#fieldCat").value;
      return DB.categoryConfig.find(function (x) {
        return x.categoryId === id;
      });
    }

    function paintRows() {
      var cat = currentCat();
      if (!cat) return;
      AppUtils.$("#secondLines").value = (cat.secondCategory || []).join("\n");
      var body = AppUtils.$("#fieldRows");
      body.innerHTML = (cat.fieldConfig || [])
        .map(function (f, idx) {
          return (
            "<tr data-idx=\"" +
            idx +
            "\">" +
            '<td><input class="input" data-k="fieldId" style="max-width:140px" value="' +
            AppUtils.escapeHtml(f.fieldId) +
            "\" /></td>" +
            '<td><input class="input" data-k="fieldName" style="max-width:160px" value="' +
            AppUtils.escapeHtml(f.fieldName) +
            "\" /></td>" +
            '<td><select class="select" data-k="fieldType" style="max-width:140px">' +
            ["text", "number", "select", "textarea"]
              .map(function (t) {
                return (
                  "<option value=\"" +
                  t +
                  '"' +
                  (f.fieldType === t ? " selected" : "") +
                  ">" +
                  t +
                  "</option>"
                );
              })
              .join("") +
            "</select></td>" +
            '<td><input type="checkbox" data-k="required" ' +
            (f.required ? "checked" : "") +
            " /></td>" +
            '<td><input type="checkbox" data-k="isFilter" ' +
            (f.isFilter ? "checked" : "") +
            " /></td>" +
            '<td><input class="input" data-k="options" style="max-width:220px" value="' +
            AppUtils.escapeHtml((f.options || []).join(",")) +
            "\" /></td>" +
            '<td><button class="btn" type="button" data-del-field="' +
            idx +
            '">删</button> ' +
            '<button class="btn" type="button" data-up-field="' +
            idx +
            '">↑</button> ' +
            '<button class="btn" type="button" data-down-field="' +
            idx +
            '">↓</button></td>' +
            "</tr>"
          );
        })
        .join("");
      AppUtils.$all("[data-del-field]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var i = Number(b.getAttribute("data-del-field"));
          cat.fieldConfig.splice(i, 1);
          paintRows();
        });
      });
      AppUtils.$all("[data-up-field],[data-down-field]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var i = Number(b.getAttribute("data-up-field") || b.getAttribute("data-down-field"));
          var j = b.hasAttribute("data-up-field") ? i - 1 : i + 1;
          if (j < 0 || j >= cat.fieldConfig.length) return;
          var tmp = cat.fieldConfig[i];
          cat.fieldConfig[i] = cat.fieldConfig[j];
          cat.fieldConfig[j] = tmp;
          paintRows();
        });
      });
    }

    AppUtils.$("#fieldCat").addEventListener("change", paintRows);
    AppUtils.$("#addFieldRow").addEventListener("click", function () {
      var cat = currentCat();
      if (!cat) return;
      cat.fieldConfig = cat.fieldConfig || [];
      cat.fieldConfig.push({
        fieldId: "f_" + Date.now().toString(36),
        fieldName: "新字段",
        fieldType: "text",
        required: false,
        isFilter: false,
      });
      paintRows();
    });

    AppUtils.$("#saveFields").addEventListener("click", async function () {
      var cat = currentCat();
      if (!cat) return;
      var lines = AppUtils.$("#secondLines").value.split(/\r?\n/).map(function (x) {
        return x.trim();
      }).filter(Boolean);
      cat.secondCategory = lines;

      var rows = AppUtils.$all("#fieldRows tr");
      var next = [];
      rows.forEach(function (tr) {
        var get = function (k) {
          return AppUtils.$("[data-k=\"" + k + "\"]", tr);
        };
        var fieldId = get("fieldId").value.trim();
        var fieldName = get("fieldName").value.trim();
        var fieldType = get("fieldType").value;
        var options = get("options")
          .value.split(",")
          .map(function (x) {
            return x.trim();
          })
          .filter(Boolean);
        next.push({
          fieldId: fieldId,
          fieldName: fieldName,
          fieldType: fieldType,
          required: get("required").checked,
          isFilter: get("isFilter").checked,
          options: fieldType === "select" ? options : undefined,
        });
      });
      cat.fieldConfig = next;
      try {
        await persist("admin: update fields " + cat.categoryId);
        renderAll();
      } catch (e) {
        AppUtils.toast(e.message || String(e), "error");
      }
    });

    paintRows();
  }

  function camDraftValue(data, f) {
    if (AppUtils.ROOT_FIELD_IDS[f.fieldId]) return data[f.fieldId];
    return data.specs ? data.specs[f.fieldId] : undefined;
  }

  function validateCam(cat, data) {
    for (var i = 0; i < cat.fieldConfig.length; i++) {
      var f = cat.fieldConfig[i];
      var v = camDraftValue(data, f);
      if (f.required && (v === undefined || v === null || String(v).trim() === "")) {
        throw new Error("缺少必填字段：" + f.fieldName);
      }
      if (f.fieldType === "number" && v !== undefined && v !== null && String(v) !== "") {
        if (f.fieldId === "year" && !/^\d{4}$/.test(String(v))) {
          throw new Error("发布年份需为 4 位数字");
        }
      }
      if (f.fieldType === "select" && v) {
        var opts = f.options || [];
        if (opts.length && opts.indexOf(String(v)) < 0) {
          throw new Error("字段 " + f.fieldName + " 的选项不合法");
        }
      }
    }
  }

  function readCamForm(cat) {
    var data = { specs: {} };
    cat.fieldConfig.forEach(function (f) {
      var el = AppUtils.$('#camForm [data-fid="' + f.fieldId + '"]');
      if (!el) return;
      var val;
      if (el.type === "checkbox") val = el.checked;
      else val = el.value;
      if (f.fieldType === "number") {
        var num = val === "" ? "" : Number(val);
        if (val !== "" && !isFinite(num)) throw new Error("数字字段格式不正确：" + f.fieldName);
        if (AppUtils.ROOT_FIELD_IDS[f.fieldId]) data[f.fieldId] = num;
        else data.specs[f.fieldId] = num;
      } else {
        if (AppUtils.ROOT_FIELD_IDS[f.fieldId]) data[f.fieldId] = val;
        else data.specs[f.fieldId] = val;
      }
    });
    return data;
  }

  function buildCamForm(cat, cam) {
    var rows = cat.fieldConfig
      .map(function (f) {
        var val = cam ? AppUtils.getCamField(cam, f.fieldId) : "";
        if (f.fieldType === "textarea") {
          return (
            '<div class="form-field"><label>' +
            AppUtils.escapeHtml(f.fieldName) +
            (f.required ? "（必填）" : "") +
            '</label><textarea class="textarea" data-fid="' +
            AppUtils.escapeHtml(f.fieldId) +
            '">' +
            AppUtils.escapeHtml(val === undefined || val === null ? "" : String(val)) +
            "</textarea></div>"
          );
        }
        if (f.fieldType === "select") {
          var opts = (f.options || [])
            .map(function (o) {
              return (
                "<option " +
                (String(val) === String(o) ? "selected" : "") +
                ">" +
                AppUtils.escapeHtml(o) +
                "</option>"
              );
            })
            .join("");
          return (
            '<div class="form-field"><label>' +
            AppUtils.escapeHtml(f.fieldName) +
            (f.required ? "（必填）" : "") +
            '</label><select class="select" data-fid="' +
            AppUtils.escapeHtml(f.fieldId) +
            '" style="max-width:none">' +
            (f.required ? "" : "<option value=\"\"></option>") +
            opts +
            "</select></div>"
          );
        }
        var type = f.fieldType === "number" ? "number" : "text";
        return (
          '<div class="form-field"><label>' +
          AppUtils.escapeHtml(f.fieldName) +
          (f.required ? "（必填）" : "") +
          '</label><input class="input" type="' +
          type +
          '" data-fid="' +
          AppUtils.escapeHtml(f.fieldId) +
          '" style="max-width:none" value="' +
          AppUtils.escapeHtml(val === undefined || val === null ? "" : String(val)) +
          '" /></div>'
        );
      })
      .join("");
    return '<div id="camForm">' + rows + "</div>";
  }

  function renderCameras() {
    var cats = sortedCategories();
    var opts = cats
      .map(function (c) {
        return (
          '<option value="' +
          AppUtils.escapeHtml(c.categoryId) +
          '">' +
          AppUtils.escapeHtml(c.categoryName) +
          "</option>"
        );
      })
      .join("");
    panel.innerHTML =
      '<div class="section-title">相机数据</div>' +
      '<div class="row" style="margin-bottom:10px;">' +
      '<select class="select" id="camCat" style="max-width:260px">' +
      opts +
      "</select>" +
      '<input class="input" id="camSearch" placeholder="品牌/机型搜索" style="max-width:260px" />' +
      '<button class="btn btn-primary" type="button" id="camAdd">新增机型</button>' +
      "</div>" +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>品牌</th><th>机型</th><th>年份</th><th>更新</th><th></th></tr></thead><tbody id="camBody"></tbody></table></div>';

    function currentCat() {
      var id = AppUtils.$("#camCat").value;
      return DB.categoryConfig.find(function (x) {
        return x.categoryId === id;
      });
    }

    function paintCams() {
      var cat = currentCat();
      if (!cat) return;
      var q = AppUtils.$("#camSearch").value.trim().toLowerCase();
      var list = camerasOf(cat.categoryId).filter(function (c) {
        if (!q) return true;
        return (c.brand + " " + c.model).toLowerCase().indexOf(q) >= 0;
      });
      AppUtils.$("#camBody").innerHTML = list
        .map(function (c) {
          return (
            "<tr>" +
            "<td>" +
            c.id +
            "</td>" +
            "<td>" +
            AppUtils.escapeHtml(c.brand || "") +
            "</td>" +
            "<td>" +
            AppUtils.escapeHtml(c.model || "") +
            "</td>" +
            "<td>" +
            AppUtils.escapeHtml(String(c.year || "")) +
            "</td>" +
            "<td>" +
            AppUtils.escapeHtml(String(c.updateTime || "")) +
            "</td>" +
            '<td class="row">' +
            '<button class="btn" type="button" data-edit-cam="' +
            c.id +
            '">编辑</button>' +
            '<button class="btn" type="button" data-del-cam="' +
            c.id +
            '">删除</button>' +
            "</td>" +
            "</tr>"
          );
        })
        .join("");

      AppUtils.$all("[data-edit-cam]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = Number(b.getAttribute("data-edit-cam"));
          var cam = DB.cameraData.find(function (x) {
            return Number(x.id) === id;
          });
          openModal("编辑机型", buildCamForm(cat, cam), async function () {
            var data = readCamForm(cat);
            validateCam(cat, data);
            cat.fieldConfig.forEach(function (f) {
              if (AppUtils.ROOT_FIELD_IDS[f.fieldId]) cam[f.fieldId] = data[f.fieldId];
            });
            cam.specs = cam.specs || {};
            cat.fieldConfig.forEach(function (f) {
              if (!AppUtils.ROOT_FIELD_IDS[f.fieldId]) cam.specs[f.fieldId] = data.specs[f.fieldId];
            });
            cam.categoryId = cat.categoryId;
            cam.updateTime = AppUtils.todayStr();
            await persist("admin: update camera " + id);
          });
        });
      });
      AppUtils.$all("[data-del-cam]").forEach(function (b) {
        b.addEventListener("click", async function () {
          var id = Number(b.getAttribute("data-del-cam"));
          DB.cameraData = DB.cameraData.filter(function (x) {
            return Number(x.id) !== id;
          });
          try {
            await persist("admin: delete camera " + id);
            paintCams();
          } catch (e) {
            AppUtils.toast(e.message || String(e), "error");
          }
        });
      });
    }

    AppUtils.$("#camCat").addEventListener("change", paintCams);
    AppUtils.$("#camSearch").addEventListener("input", paintCams);
    AppUtils.$("#camAdd").addEventListener("click", function () {
      var cat = currentCat();
      if (!cat) return;
      openModal("新增机型", buildCamForm(cat, null), async function () {
        var data = readCamForm(cat);
        validateCam(cat, data);
        var cam = { id: nextCameraId(), categoryId: cat.categoryId, specs: {} };
        cat.fieldConfig.forEach(function (f) {
          if (AppUtils.ROOT_FIELD_IDS[f.fieldId]) cam[f.fieldId] = data[f.fieldId];
        });
        cam.specs = data.specs || {};
        cam.updateTime = AppUtils.todayStr();
        DB.cameraData.push(cam);
        await persist("admin: add camera");
      });
    });

    paintCams();
  }

  function renderImport() {
    var cats = sortedCategories();
    var opts = cats
      .map(function (c) {
        return (
          '<option value="' +
          AppUtils.escapeHtml(c.categoryId) +
          '">' +
          AppUtils.escapeHtml(c.categoryName) +
          "</option>"
        );
      })
      .join("");
    panel.innerHTML =
      '<div class="section-title">批量导入</div>' +
      '<p class="muted">按 PRD：导入 JSON 为数组，不含品牌字段；品牌由下方输入框指定。重复（品牌+机型）将覆盖。</p>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label>一级大类型</label><select class="select" id="impCat" style="max-width:none">' +
      opts +
      "</select></div>" +
      '<div class="form-field"><label>目标品牌</label><input class="input" id="impBrand" style="max-width:none" placeholder="例如：佳能" /></div>' +
      "</div>" +
      '<div class="row" style="margin:10px 0;">' +
      '<a class="btn btn-ghost" href="templates/import-template.json" download>下载模板</a>' +
      '<input type="file" id="impFile" accept="application/json,.json" />' +
      "</div>" +
      '<pre class="panel" id="impPreview" style="max-height:240px;overflow:auto;display:none;"></pre>' +
      '<div class="row">' +
      '<button class="btn btn-primary" type="button" id="impDo" disabled>确认导入</button>' +
      "</div>";

    var pending = null;
    AppUtils.$("#impFile").addEventListener("change", function () {
      var f = AppUtils.$("#impFile").files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var arr = JSON.parse(String(reader.result || "[]"));
          if (!Array.isArray(arr)) throw new Error("JSON 根必须是数组");
          pending = arr;
          AppUtils.$("#impPreview").style.display = "block";
          AppUtils.$("#impPreview").textContent = JSON.stringify(arr, null, 2).slice(0, 8000);
          AppUtils.$("#impDo").disabled = false;
        } catch (e) {
          pending = null;
          AppUtils.$("#impDo").disabled = true;
          AppUtils.toast(e.message || String(e), "error");
        }
      };
      reader.readAsText(f);
    });

    AppUtils.$("#impDo").addEventListener("click", async function () {
      if (!pending) return;
      var catId = AppUtils.$("#impCat").value;
      var brand = AppUtils.$("#impBrand").value.trim();
      if (!brand) return AppUtils.toast("请填写品牌", "error");
      var cat = DB.categoryConfig.find(function (x) {
        return x.categoryId === catId;
      });
      if (!cat) return;

      var ok = 0;
      var fail = 0;
      var nid = nextCameraId();
      pending.forEach(function (item) {
        try {
          var cam = Object.assign({ specs: item.specs || {} }, item);
          cam.brand = brand;
          cam.categoryId = catId;
          cam.id = cam.id && Number(cam.id) ? Number(cam.id) : nid++;
          cam.updateTime = AppUtils.todayStr();
          validateCam(cat, cam);
          var idx = DB.cameraData.findIndex(function (x) {
            return x.categoryId === catId && x.brand === brand && x.model === cam.model;
          });
          if (idx >= 0) DB.cameraData[idx] = cam;
          else DB.cameraData.push(cam);
          ok++;
        } catch (e) {
          fail++;
        }
      });
      try {
        await persist("admin: batch import");
        AppUtils.toast("导入完成：成功 " + ok + "，失败 " + fail);
        pending = null;
        AppUtils.$("#impDo").disabled = true;
        renderAll();
      } catch (e) {
        AppUtils.toast(e.message || String(e), "error");
      }
    });
  }

  function renderBackup() {
    panel.innerHTML =
      '<div class="section-title">备份与恢复</div>' +
      '<div class="row" style="margin-bottom:10px;">' +
      '<button class="btn btn-primary" type="button" id="dlBackup">一键备份（下载 data.json）</button>' +
      "</div>" +
      '<div class="form-field">' +
      "<label>一键恢复：选择本地 data.json</label>" +
      '<input type="file" id="restoreFile" accept="application/json,.json" />' +
      "</div>" +
      '<pre class="panel" id="restorePreview" style="max-height:260px;overflow:auto;display:none;"></pre>' +
      '<div class="row">' +
      '<button class="btn btn-primary" type="button" id="restoreDo" disabled>预览确认后覆盖仓库</button>' +
      "</div>";

    AppUtils.$("#dlBackup").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "data.json";
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 2000);
    });

    var restoreObj = null;
    AppUtils.$("#restoreFile").addEventListener("change", function () {
      var f = AppUtils.$("#restoreFile").files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          restoreObj = JSON.parse(String(reader.result || "{}"));
          if (!restoreObj.siteConfig || !Array.isArray(restoreObj.categoryConfig) || !Array.isArray(restoreObj.cameraData)) {
            throw new Error("文件结构不符合 data.json 规范");
          }
          AppUtils.$("#restorePreview").style.display = "block";
          AppUtils.$("#restorePreview").textContent = JSON.stringify(restoreObj, null, 2).slice(0, 12000);
          AppUtils.$("#restoreDo").disabled = false;
        } catch (e) {
          restoreObj = null;
          AppUtils.$("#restoreDo").disabled = true;
          AppUtils.toast(e.message || String(e), "error");
        }
      };
      reader.readAsText(f);
    });

    AppUtils.$("#restoreDo").addEventListener("click", async function () {
      if (!restoreObj) return;
      DB = restoreObj;
      try {
        await persist("admin: restore data.json");
        AppUtils.toast("恢复完成");
        restoreObj = null;
        AppUtils.$("#restoreDo").disabled = true;
        renderAll();
      } catch (e) {
        AppUtils.toast(e.message || String(e), "error");
      }
    });
  }

  function renderAll() {
    renderNav();
    if (activeSection === "site") renderSite();
    else if (activeSection === "cats") renderCategories();
    else if (activeSection === "fields") renderFields();
    else if (activeSection === "cameras") renderCameras();
    else if (activeSection === "import") renderImport();
    else if (activeSection === "backup") renderBackup();
  }

  async function boot() {
    try {
      DB = await GithubStorage.loadJson();
      renderAll();
    } catch (e) {
      panel.innerHTML = '<div class="empty">加载失败：' + AppUtils.escapeHtml(e.message || String(e)) + "</div>";
      AppUtils.toast(e.message || String(e), "error");
    }
  }

  boot();
})();
