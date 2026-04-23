/** 后台登录：校验 data.json 中的密码 */
(function () {
  var pwd = AppUtils.$("#pwd");
  var btn = AppUtils.$("#btnLogin");
  var hint = AppUtils.$("#hint");

  async function tryLogin() {
    hint.textContent = "";
    try {
      var db = await GithubStorage.loadJson();
      var expect = (db.siteConfig && db.siteConfig.password) || "";
      if (!pwd.value) {
        hint.textContent = "请输入密码。";
        return;
      }
      if (pwd.value !== expect) {
        hint.textContent = "密码不正确。";
        return;
      }
      sessionStorage.setItem("ADM_AUTH", "1");
      location.href = "admin.html";
    } catch (e) {
      AppUtils.toast(e.message || String(e), "error");
      hint.textContent = e.message || String(e);
    }
  }

  btn.addEventListener("click", tryLogin);
  pwd.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryLogin();
  });
})();
