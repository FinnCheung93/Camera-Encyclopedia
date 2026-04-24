/** 通用工具：提示、深拷贝、日期与字段读写 */
(function (global) {
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function toast(message, type) {
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("toast-show");
    });
    setTimeout(function () {
      el.classList.remove("toast-show");
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 2600);
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }

  /** 顶层字段：其余自定义进 specs */
  var ROOT_FIELD_IDS = {
    brand: true,
    model: true,
    year: true,
    image: true,
    remark: true,
  };

  function ensureSpecs(cam) {
    if (!cam.specs || typeof cam.specs !== "object") cam.specs = {};
    return cam.specs;
  }

  function getCamField(cam, fieldId) {
    if (ROOT_FIELD_IDS[fieldId]) return cam[fieldId];
    return ensureSpecs(cam)[fieldId];
  }

  function setCamField(cam, fieldId, value) {
    if (ROOT_FIELD_IDS[fieldId]) {
      cam[fieldId] = value;
      return;
    }
    ensureSpecs(cam)[fieldId] = value;
  }

  function parseParams() {
    var q = window.location.search.replace(/^\?/, "");
    var out = {};
    if (!q) return out;
    q.split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      var k = decodeURIComponent(i >= 0 ? pair.slice(0, i) : pair);
      var v = decodeURIComponent(i >= 0 ? pair.slice(i + 1) : "");
      out[k] = v;
    });
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.AppUtils = {
    $: $,
    $all: $all,
    toast: toast,
    deepClone: deepClone,
    todayStr: todayStr,
    getCamField: getCamField,
    setCamField: setCamField,
    parseParams: parseParams,
    escapeHtml: escapeHtml,
    ROOT_FIELD_IDS: ROOT_FIELD_IDS,
  };
})(window);
