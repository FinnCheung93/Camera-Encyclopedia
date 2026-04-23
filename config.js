/**
 * 敏感与部署相关配置（不随 data.json 写入仓库时可单独维护 Token）
 * 使用说明：
 * 1. 将 owner / repo / token / branch 改为你的 GitHub 信息；分支默认 gh-pages。
 * 2. Fine-grained PAT：仅勾选当前仓库 Contents: Read and write。
 * 3. 本地双击打开 file:// 预览时，可将 useLocalDataJson 设为 true，此时只读取同目录 data.json，不调用 GitHub API。
 */
window.APP_CONFIG = {
  github: {
    owner: "FinnCheung93",
    repo: "Camera-Encyclopedia",
    token: "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",
    branch: "gh-pages",
    dataPath: "data.json",
  },
  /** 本地离线预览：true 时仅从 ./data.json 读取，保存类操作会提示不可用 */
  useLocalDataJson: false,
};
