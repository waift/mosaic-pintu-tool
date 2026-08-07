# 项目记忆：MOSAIC 拼图工具

## 项目身份
- 名称：MOSAIC · 拼图工具（文件夹名「拼图工具」，包名 trae-project，由 Trae 生成）
- 类型：纯前端浏览器本地长图拼接工具（图片不上传，全部在本地 Canvas 完成）
- 状态：功能已基本完成，`tsc -b --noEmit` 类型检查通过（2026-07-09）

## 技术栈
- React 18 + TypeScript + Vite 6
- 状态管理：zustand（`src/store/stitchStore.ts`）
- 拖拽排序：@dnd-kit（图片列表重排）
- EXIF 方向修正：exifr
- 样式：Tailwind CSS 3 + 自定义 design token（暗/亮双主题，主题键 `mosaic-theme`）
- 图标：lucide-react

## 已实现功能
- 多种上传方式：点击/双击/拖拽/全局 Ctrl+V 粘贴
- 图片校验：类型、数量上限 30、单图最长边 ≤ 8000px
- EXIF orientation 自动修正（1-8 全部情况）
- dnd-kit 拖拽排序 + 点击查看原图（ImageModal）
- 拼接配置：方向（垂直/水平）、间距、背景色、透明背景、输出格式（PNG/JPG/WebP）、质量
- 等比放大基准尺寸布局 + Canvas 上限保护（16000px）
- 预览面板：自适应/滚轮缩放/拖拽平移/棋盘格透明指示
- 下载结果、Toast 提示、重置、主题切换

## 可能的后续（未实现/待确认）
- 无多页面路由（仅 `/` 一个路由）
- 无自动化测试
- 未初始化 git 仓库
