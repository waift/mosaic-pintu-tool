# 项目记忆：MOSAIC 拼图工具

## 项目身份
- 名称：MOSAIC · 拼图工具（文件夹名「拼图工具」，包名 `mosaic-tool`）
- 类型：纯前端浏览器本地长图拼接工具（图片不上传，全部在本地 Canvas 完成）
- 仓库：https://github.com/waift/mosaic-pintu-tool （Public）
- 线上：https://waift.github.io/mosaic-pintu-tool/ （GitHub Pages，CI 自动部署）

## 技术栈
- React 18 + TypeScript + Vite 6
- 状态管理：zustand（`src/store/stitchStore.ts`）
- 拖拽排序：@dnd-kit（图片列表重排 + 图片管理弹窗多选整组拖拽）
- EXIF 方向修正：exifr
- 样式：Tailwind CSS 3 + 自定义 design token（base/ink/accent/warn，暗/亮双主题，主题键 `mosaic-theme`）
- 图标：lucide-react
- 测试：Vitest 4 + jsdom 30

## 关键约定（改动前必读）
- **main = 生产环境**，push 即自动上线。半成品必须开 feature 分支。
- 不可改动：`vite.config.ts` 的 `base: './'`；`App.tsx` 的 `HashRouter`（改了 GitHub Pages 会白屏/404）。
- **根目录 `single.html` 绝对不能删** —— 它是 `vite.singlefile.config.ts` 的构建入口模板（含防主题闪烁内联脚本），不是构建残留。
- 双产物：
  - 网站版 `npm run build` → CI 自动部署
  - 离线单文件 `npm run build:single` && `cp dist-single/single.html "拼图工具.html"`（**手动**，容易漏，改完交互记得同步）
  - `拼图工具.html` 被 .gitignore 忽略，提交需 `git add -f`
- 本环境 Edit 工具偶发失败，大改优先用 Write 全文件重写。

## 质量防线（三关 + 一兜底）
CI（`.github/workflows/deploy.yml`）在 Build 前依次跑，任一失败即阻止部署：
1. `npm run check` → `tsc -b --noEmit`
2. `npm run lint` → `eslint .`
3. `npm test` → `vitest run`

外加 `src/components/ErrorBoundary.tsx` 包裹 App，兜住运行时异常不白屏（含「重试」不丢图片 +「重新加载」，dev 环境显示组件栈）。

本地 push 前自查：`npm run check && npm run lint && npm test`

## 测试现状
- `src/utils/image.test.ts`：48 条，覆盖 uid / applyOrientationSize / validateFiles / filterBySize / hexToRgba / bitmapToOrientedCanvas / planStitch，约 0.8s
- `src/test/setup.ts`：给 jsdom 打 Canvas 2D 桩（jsdom 不实现 getContext）+ 补 URL.createObjectURL；导出 `getStubCalls(canvas)` 可断言 transform 序列
- 未覆盖：store（zustand）、React 组件、stitchAndExport（依赖真实 Canvas 编码）

## 已实现功能
- 上传：单击（高亮待粘贴态，**不自动读剪贴板**）/ 双击选文件 / 拖拽 / 全局 Ctrl+V
- 校验：类型、数量上限 30、单图最长边 ≤ 8000px
- EXIF orientation 自动修正（1-8 全部情况）
- dnd-kit 拖拽排序 + 点击查看原图；图片管理弹窗（多选、整组拖拽、可拖到队列末尾、一键清空）
- 拼接配置：方向、间距、背景色、透明背景、格式（PNG/JPG/WebP）、质量
- 等比放大基准尺寸布局 + Canvas 上限保护（16000px）
- 预览：自适应/滚轮缩放/拖拽平移/棋盘格透明指示；下载、Toast、重置、主题切换

## 交互决策（用户已确认，勿反复）
- 多选拖拽：选中项**原地保留虚线占位镜像**（`opacity-40 + border-dashed`）。
  已否决方案 C（收缩成 12px 细槽）与"完全抽出不留痕"，后续不要再提。
- 单击导入区只做视觉引导（边框高亮 + 提示按 Ctrl+V），**Ctrl+V 保持全局可用**；
  高亮在「粘贴成功 / 点击别处 / Esc」三者任一时取消。

## 尚未实现
- 单图编辑（旋转/翻转/裁剪/滤镜）
- 撤销重做（可用 zundo 挂 zustand）
- 网格/模板拼接
- Prettier、store 与组件层测试
