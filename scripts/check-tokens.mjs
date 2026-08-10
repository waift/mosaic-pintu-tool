#!/usr/bin/env node
// scripts/check-tokens.mjs
//
// 校验源码里使用的颜色 token 是否都在 tailwind.config.js 的定义集合内。
// 「幽灵 token」(如 accent-300 / ink-300) 编译不报错,但样式静默失效,
// 是设计一致性最隐蔽的破坏源。本脚本挂在 `npm run lint`,提交即拦截。
//
// 单独运行: npm run check:tokens

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ---- 1. 取合法 token 集合(优先读 tailwind.config.js,失败回退硬编码) ----
const FALLBACK = {
  base: ["400", "500", "600", "700", "800", "900"],
  ink: ["50", "100", "200"],
  accent: ["400", "500", "600", "700"],
  warn: ["400", "500", "600"],
};

async function loadAllowed() {
  try {
    const mod = await import(join(root, "tailwind.config.js"));
    const colors = mod.default?.theme?.extend?.colors ?? {};
    const allowed = new Set();
    for (const fam of Object.keys(colors)) {
      for (const shade of Object.keys(colors[fam])) {
        allowed.add(`${fam}-${shade}`);
      }
    }
    if (allowed.size > 0) return allowed;
  } catch (e) {
    console.warn("[check-tokens] 读取 tailwind.config.js 失败,改用硬编码白名单:", e.message);
  }
  const allowed = new Set();
  for (const fam of Object.keys(FALLBACK)) {
    for (const shade of FALLBACK[fam]) allowed.add(`${fam}-${shade}`);
  }
  return allowed;
}

// ---- 2. 收集待扫描文件 ----
const TARGET_FILES = [join(root, "index.html")];
const TARGET_DIRS = [join(root, "src")];
const EXT = new Set([".ts", ".tsx", ".html", ".css"]);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      walk(p, out);
    } else if (EXT.has(extname(p))) {
      out.push(p);
    }
  }
}

function collectFiles() {
  const files = [...TARGET_FILES];
  for (const d of TARGET_DIRS) walk(d, files);
  return files;
}

// 仅匹配带 Tailwind 前缀的颜色 token,避免误伤 CSS 变量(--c-base-900 等)
const PREFIXES = [
  "border-t", "border-b", "border-l", "border-r", "border",
  "bg", "text", "ring", "ring-offset",
  "from", "to", "via",
  "stroke", "fill", "divide", "outline", "placeholder", "accent", "caret", "decoration",
].sort((a, b) => b.length - a.length);

const FAM = "base|ink|accent|warn";
const TOKEN_RE = new RegExp(`(?:${PREFIXES.join("|")})-(?:(${FAM})-(\\d+))`, "g");

// ---- 3. 扫描并比对 ----
async function main() {
  const allowed = await loadAllowed();
  const files = collectFiles();
  const violations = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      let m;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(line)) !== null) {
        const stem = `${m[1]}-${m[2]}`;
        if (!allowed.has(stem)) {
          violations.push({ file, line: i + 1, token: stem });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error("\n❌ 发现越界颜色 token(幽灵 token):");
    for (const v of violations) {
      const rel = v.file.replace(root + "/", "");
      console.error(`  ${rel}:${v.line}  ›  ${v.token}`);
    }
    console.error("\n该 token 未在 tailwind.config.js 定义,编译通过但样式静默失效。");
    console.error("修复:① 改用合法档位;或 ② 先在 tailwind.config.js + src/index.css 两处同步新增该档位,并在 docs/设计规范.md 白名单登记。\n");
    process.exit(1);
  }

  console.log(`✓ 颜色 token 校验通过（${files.length} 个文件，${allowed.size} 个合法档位）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
