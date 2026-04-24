/**
 * 仓库与分支（可安全提交到 GitHub）。
 * 实际读写 GitHub API 仅使用本文件的 github.*；data.json 内 siteConfig.githubConfig 为后台备忘，需与本处一致以免混淆。
 * 前台只读：仓库为 Public 时，访客无需 Token 即可加载 data.json（GitHub 匿名 API 有频率限制）。
 * Token：不要写进仓库文件。需要后台保存时，用「setup-token.html」把 PAT 存本机浏览器。
 * 本地调试：useLocalDataJson 为 true 时只读 ./data.json。
 */
window.APP_CONFIG = {
  github: {
    owner: "FinnCheung93",
    repo: "Camera-Encyclopedia",
    token: "",
    /** 与 GitHub Pages 使用的分支一致：常见为 main 或 master */
    branch: "main",
    dataPath: "data.json",
  },
  useLocalDataJson: false,
};
