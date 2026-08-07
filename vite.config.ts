import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  // 相对路径基准：让构建产物在 GitHub Pages 子路径(/mosaic-pintu-tool/)及任意静态托管下都能正确加载资源
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})
