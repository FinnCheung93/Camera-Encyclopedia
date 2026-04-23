# GitHub Pages 部署指南（一步一说明）

> 面向零 Git 基础用户：优先使用网页上传；若你熟悉 Git，也可用 Desktop 客户端或命令行。

## 1. 注册 GitHub 账号

在 https://github.com/ 注册并登录。

## 2. 新建仓库

1. 右上角 **+** → **New repository**。
2. 填写 **Repository name**（即下文中的「仓库名」）。
3. 选择 **Public** 或 **Private**（两者均可开启 Pages）。
4. 勾选 **Add a README**（可选），创建仓库。

## 3. 生成 Fine-grained PAT（推荐）

1. 头像 → **Settings** → **Developer settings** → **Fine-grained tokens** → **Generate new token**。
2. **Repository access**：选择 **Only select repositories**，勾选你的相机图鉴仓库。
3. **Permissions** → **Repository permissions** → **Contents**：选择 **Read and write**。
4. 生成后**立刻复制** Token（只显示一次），妥善保存。

> 过期时间：可按需选择 30/60/90 天或更长；到期后需重新生成并更新 `config.js`。

## 3.1 本地预览（推荐）

直接用浏览器打开 `file://` 往往无法 `fetch` 到同目录 `data.json`。建议在 `site/` 目录启动任意静态服务器，例如：

```bash
npx --yes http-server . -p 5173
```

然后访问 `http://127.0.0.1:5173/`，并确保 `config.js` 中 `useLocalDataJson: true`。

## 4. 修改配置文件

1. 打开本目录下的 `config.js`。
2. 填写 `github.owner`（用户名）、`github.repo`（仓库名）、`github.token`（上一步 PAT）。
3. 将 `useLocalDataJson` 改为 **`false`**（上线后必须通过 GitHub API 读写 `data.json`）。
4. 可选：把 `data.json` 里的 `siteConfig.githubConfig` 同步为相同 owner/repo/branch，便于备份文件自描述。

## 5. 上传网站文件到仓库

**方案 A：网页端上传**

1. 在仓库页面点击 **Add file** → **Upload files**。
2. 将 `site/` 目录内**所有文件**保持目录结构上传（`index.html`、`list.html`、`admin.html`、`admin-login.html`、`config.js`、`data.json`、`css/`、`js/`、`templates/`、`docs/`）。
3. 提交到默认分支（通常为 `main`）。

**方案 B：发布到 gh-pages 分支**

GitHub Pages 若选择 **gh-pages** 分支根目录：

1. 在仓库 **Settings** → **Pages** 中先记下目标分支（本 PRD 默认为 `gh-pages`）。
2. 在网页端新建分支 `gh-pages`，再把同样文件上传到该分支根目录；或使用 Git 将 `site` 内容推送到 `gh-pages` 根目录。

> 若你只在 `main` 放了文件，也可在 Pages 设置里把 **Source** 改为 `main` 与 `/ (root)`，同时把 `config.js` 里的 `branch` 改成 `main`，并保证 API 读写同一分支上的 `data.json`。

## 6. 开启 GitHub Pages 并验证

1. **Settings** → **Pages**。
2. **Build and deployment**：**Source** 选择 **Deploy from a branch**。
3. **Branch** 选择 `gh-pages`（或你实际上传的分支）与 **`/ (root)`**。
4. 保存后等待 1–3 分钟，访问 `https://<用户名>.github.io/<仓库名>/`（用户站点与项目站点规则以 GitHub 官方说明为准）。

## 7. 验证后台

1. 打开 `.../admin-login.html`，使用 `data.json` 中 `siteConfig.password` 登录。
2. 在后台修改站点标题并保存，刷新前台确认（GitHub CDN 可能存在 **1–5 分钟**延迟）。

## 8. 常见问题

- **前台不更新**：等待数分钟；强制刷新；确认保存到了与 Pages 相同的分支与路径。
- **保存失败 401/403**：PAT 权限不足或过期；重新生成并更新 `config.js`。
- **CORS 报错**：GitHub REST API 对浏览器端携带 Token 的请求一般可用；若使用代理或浏览器插件拦截，请关闭后重试。

## 9. 【配图位】

> 建议在以上步骤 3、5、6 各截 1 张图，插入到你自己维护的副本中，形成「一步一图」。
