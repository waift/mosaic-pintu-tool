import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // planStitch → bitmapToOrientedCanvas 依赖 document.createElement("canvas")
    // 因此需要 DOM 环境;canvas 2d 上下文由 setup 文件打桩
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // 不使用全局注入,测试文件显式 import { describe, it, expect } from "vitest"
    // 这样 tsc 与 eslint 都无需额外配置即可识别
    globals: false,
  },
});
