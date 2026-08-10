# MOSAIC · 拼图工具

纯前端、浏览器本地的长图 / 拼图拼接工具。图片全程在本地 Canvas 处理，**不上传任何服务器**，隐私安全。

## 功能

- 多种上传：点击 / 双击 / 拖拽 / 全局 `Ctrl+V` 粘贴
- 图片校验：类型、数量上限 30、单图最长边 ≤ 8000px
- EXIF orientation 1–8 自动方向修正
- 拖拽排序 + 点击查看原图
- 拼接配置：方向（垂直 / 水平）、间距、背景色 / 透明、输出格式（PNG / JPG / WebP）、质量
- 预览：滚轮缩放、拖拽平移、透明棋盘格
- 下载结果、主题切换

## 使用方式

| 方式 | 命令 / 地址 | 说明 |
|------|------------|------|
| **在线网页** | https://waift.github.io/mosaic-pintu-tool/ | 部署在 GitHub Pages，任何人可访问 |
| **本地开发** | `npm install && npm run dev` | 打开终端给出的 `http://localhost:xxxx/` |
| **双击离线版** | 根目录 `拼图工具.html` | 无需 Node / 服务器 / 联网，自包含单文件 |

## 构建与检查

```bash
npm run build        # 产出 dist/（用于部署 / 在线网页）
npm run build:single # 产出 dist-single/single.html，再 cp 为根目录 拼图工具.html
npm run check        # tsc 类型检查
npm run lint         # eslint 代码规范
npm test             # vitest 单元测试（48 条，约 0.8s）
```

## 项目文档

| 文档 | 内容 |
|------|------|
| **[docs/开发报告.md](./docs/开发报告.md)** | 技术主文档：架构、关键决策（ADR）、踩坑清单、开发日志、技术债。**接手维护先读这份** |
| [docs/功能规划.md](./docs/功能规划.md) | 功能路线图、优先级、已否决方案 |
| [docs/设计规范.md](./docs/设计规范.md) | 设计令牌与 UI 组件视觉规范（颜色 / 字体 / 圆角 / 阴影 / 动效 / 主题 / 组件模式），**改样式先查这份** |
| 本文件 | 怎么用、怎么改、分支与提交规范 |

---

## 开发与更新规范（重要）

> ⚠️ **`main` 分支 = 线上生产环境**：仓库配了 GitHub Actions，任何 push 到 `main` 都会**自动重新构建并发布到 GitHub Pages**。请不要把半成品直接 push 到 main。

### 1. 分支策略

| 场景 | 做法 |
|------|------|
| 新功能 / 较大改动 | **必须开分支** `feature/xxx` 开发，测好再合并回 main |
| Bug 修复（多文件） | 开分支 `fix/xxx` |
| 一行小修（文案 / typo） | 可直接在 main |

```bash
git switch main && git pull
git switch -c feature/你的功能名
# 开发 + 本地 npm run dev 自测
git add . && git commit -m "feat: ..."
git push -u origin feature/你的功能名
# GitHub 上开 Pull Request 合并回 main
```

分支命名：`feature/xxx`（功能）、`fix/xxx`（修复）、`chore/xxx`（工程调整）。

### 2. 改动前不要动的两处（动了 Pages 会白屏）

- `vite.config.ts` 里的 `base: './'` —— 子路径资源加载依赖它
- `src/App.tsx` 里的 **HashRouter** —— GitHub Pages 挂在 `/mosaic-pintu-tool/` 子路径，BrowserRouter 会因根路径不匹配而白屏

### 3. 两个产物要保持同步

改了源码后，这两份成品都要重新构建，否则版本会脱节：

- **网站**：`npm run build` → 自动上线
- **单文件**：`npm run build:single` → `cp dist-single/single.html 拼图工具.html`

### 4. 依赖变动

GitHub 用 `npm ci` 严格按 `package-lock.json` 安装。本地加 / 删依赖后，**必须提交 lock 文件**，否则线上构建与本地不一致。

### 5. 推送权限

- 普通代码推送：token 需 `repo` 权限
- 修改 `.github/` 下文件（部署流程）：token 还需 **`workflow`** 权限

### 6. 提交前自测

改完先 `npm run dev` 在浏览器自测，然后跑一遍与 CI **完全相同**的三道门禁：

```bash
npm run check && npm run lint && npm test
```

CI（`deploy.yml`）会在部署前依次执行 `tsc → eslint → vitest`，**任一失败则不发布**。本地先跑几秒钟出结果，比等 CI 快。

---

## 技术栈

React 18 · TypeScript · Vite 6 · zustand · @dnd-kit · exifr · Tailwind CSS 3 · lucide-react

## 部署

GitHub Actions（`.github/workflows/deploy.yml`）：push 到 `main` → `npm ci` → `npm run build` → 发布 GitHub Pages。
