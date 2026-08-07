import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

// 单文件构建配置：产出可双击打开的 self-contained HTML
// 入口使用 single.html（HashRouter，兼容 file://），不引入 Trae 角标
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tsconfigPaths(),
    viteSingleFile(),
  ],
  build: {
    outDir: "dist-single",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: fileURLToPath(new URL("single.html", import.meta.url)),
    },
  },
});
