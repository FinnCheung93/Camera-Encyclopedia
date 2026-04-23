/**
 * 仓库与分支（可安全提交到 GitHub）。
 * Token：不要写在本文件里上传！请打开「setup-token.html」粘贴 PAT，会保存在本机浏览器。
 * 本地调试：可将 useLocalDataJson 设为 true，仅从同目录 data.json 读取。
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
