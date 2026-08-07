import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "mosaic-theme";

/** 读取初始主题:localStorage → 系统偏好 → dark */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

/** 主题切换 hook:持久化 + 同步 html class */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    // 同步首帧内联背景色,避免切换主题时回闪
    if (theme === "light") {
      root.style.backgroundColor = "#f0f0ea";
      root.style.color = "#1a1a1f";
    } else {
      root.style.backgroundColor = "#0e0e12";
      root.style.color = "#f5f5f0";
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle, setTheme };
}
