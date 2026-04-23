# Cloudflare Pages 反向代理 GitHub Pages（可选）

> 目的：改善部分地区访问 GitHub Pages 的速度与稳定性；以下为思路级说明，具体以 Cloudflare 与 GitHub 当时的产品界面为准。

## 思路概览

1. 在 **Cloudflare** 侧新建一个 **Pages** 或 **Workers** 项目，对外提供你的自定义域名或 `*.pages.dev` 子域。
2. 由该项目在边缘节点 **反向代理** 到 GitHub Pages 的源站 URL（你的 `*.github.io/仓库名/` 完整地址）。
3. 浏览器用户访问 Cloudflare 域名，由 Cloudflare 回源拉取静态资源并缓存（注意 HTML 与 `data.json` 的缓存策略，避免长时间看不到后台更新）。

## 注意事项

- **后台 GitHub API**：仍由浏览器直连 `api.github.com`，与是否使用 Cloudflare 访问前台静态页**相互独立**；若 API 也被网络限制，需要另行解决（本 PRD 未要求）。
- **缓存**：若启用缓存，`data.json` 建议设置较短 TTL 或不缓存，避免前台长期不更新。
- **HTTPS**：Cloudflare 默认提供证书；源站 GitHub 亦为 HTTPS。

## 【配图位】

> 建议在 Cloudflare 控制台关键步骤截图，补充到团队内部副本。
