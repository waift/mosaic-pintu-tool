import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";

// 统一入口：根据访问协议自动选择路由策略，dev 与单文件共用同一份源码
// - http(s):（本地 dev / 部署到服务器）用 BrowserRouter
// - file:（直接双击打开的单文件 HTML）用 HashRouter，规避 file:// 下 BrowserRouter 白屏
const Router =
  typeof window !== "undefined" && window.location.protocol === "file:"
    ? HashRouter
    : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
