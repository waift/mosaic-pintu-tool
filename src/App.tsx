import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";

// 统一入口：始终用 HashRouter，兼容三种运行环境：
// - file://（双击单文件 HTML）
// - https:// 子路径（GitHub Pages 部署在 /mosaic-pintu-tool/）
// - http://localhost（本地 dev）
// BrowserRouter 在 GitHub Pages 子路径下会因根路径不匹配而白屏，故不使用。
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
