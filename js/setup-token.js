/** 将 GitHub PAT 写入本机浏览器，避免把 Token 提交进仓库触发 Secret scanning */
(function () {
  var KEY = "CAM_GITHUB_PAT";

  function $(id) {
    return document.getElementById(id);
  }

  function load() {
    try {
      var t = localStorage.getItem(KEY) || "";
      $("token").value = t;
    } catch (e) {}
  }

  $("btnSave").addEventListener("click", function () {
    var raw = ($("token").value || "").replace(/\s+/g, "").trim();
    if (!raw) {
      alert("请先粘贴 Personal Access Token。");
      return;
    }
    try {
      localStorage.setItem(KEY, raw);
      $("ok").textContent = "已保存。此电脑上的浏览器会记住 Token，请返回首页刷新。请勿在公开截图里泄露本页。";
    } catch (e) {
      alert("无法写入浏览器存储：" + (e.message || e));
    }
  });

  $("btnClear").addEventListener("click", function () {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    $("token").value = "";
    $("ok").textContent = "已清除本机保存的 Token。";
  });

  load();
})();
