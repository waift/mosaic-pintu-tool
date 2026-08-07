import { useCallback, useEffect } from "react";
import { Sparkles, RotateCcw, Sun, Moon } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ImageList from "@/components/ImageList";
import StitchConfig from "@/components/StitchConfig";
import PreviewPanel from "@/components/PreviewPanel";
import Toast from "@/components/Toast";
import { useStitchStore } from "@/store/stitchStore";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useTheme } from "@/hooks/useTheme";
import { stitchAndExport } from "@/utils/image";
import { cn } from "@/lib/utils";

export default function Home() {
  const images = useStitchStore((s) => s.images);
  const config = useStitchStore((s) => s.config);
  const status = useStitchStore((s) => s.status);
  const result = useStitchStore((s) => s.result);
  const error = useStitchStore((s) => s.error);
  const setStatus = useStitchStore((s) => s.setStatus);
  const setResult = useStitchStore((s) => s.setResult);
  const setError = useStitchStore((s) => s.setError);
  const showToast = useStitchStore((s) => s.showToast);
  const reset = useStitchStore((s) => s.reset);

  const { theme, toggle: toggleTheme } = useTheme();

  const handleFiles = useImageUpload();

  // 全局粘贴监听
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  // 生成主流程
  const onGenerate = useCallback(async () => {
    if (images.length === 0) {
      showToast("请先添加图片");
      return;
    }
    setStatus("generating");
    setError(null);
    setResult(null);

    try {
      const { blob, width, height } = await stitchAndExport(images, config);
      const previewUrl = URL.createObjectURL(blob);
      // 释放上一次的预览 URL
      if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
      setResult({ blob, previewUrl, width, height, format: config.format });
      setStatus("done");
      showToast("生成成功");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [images, config, result, setStatus, setResult, setError, showToast]);

  const generating = status === "generating";
  const canGenerate = images.length > 0 && !generating;

  return (
    <div className="flex h-screen flex-col">
      {/* 顶部标题栏 */}
      <header className="flex items-center justify-between border-b border-base-500 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent-500/15 text-accent-400">
            <Sparkles size={16} strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-base font-semibold tracking-wide text-ink-50">
            MOSAIC
          </h1>
          <span className="font-mono text-[10px] text-ink-200">
            · 拼图工具
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded text-ink-200 transition-colors",
              "hover:bg-base-700 hover:text-ink-100",
            )}
            title={theme === "dark" ? "切换到浅色" : "切换到深色"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={reset}
            disabled={images.length === 0 && !result}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5",
              "font-mono text-[11px] text-ink-200 transition-colors",
              "hover:bg-base-700 hover:text-ink-100",
              "disabled:cursor-not-allowed disabled:opacity-30",
            )}
            title="清空全部"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
      </header>

      {/* 主体:左右分栏 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左侧控制区 */}
        <aside className="flex w-2/5 min-w-[360px] max-w-[480px] flex-col gap-4 overflow-y-auto border-r border-base-500 p-4">
          <UploadZone />
          <ImageList />
          <StitchConfig />

          {/* 生成按钮 */}
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className={cn(
              "flex items-center justify-center gap-2 rounded px-4 py-3",
              "font-display text-sm font-medium transition-all",
              canGenerate
                ? "bg-accent-500 text-base-900 shadow-accent-glow hover:-translate-y-0.5"
                : "cursor-not-allowed bg-base-700 text-ink-200",
            )}
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-base-900/30 border-t-base-900" />
                生成中…
              </>
            ) : (
              <>
                <Sparkles size={16} strokeWidth={2.5} />
                生成长图
              </>
            )}
          </button>

          {/* 错误提示(生成失败时下方也展示) */}
          {status === "error" && error && (
            <div className="rounded border border-warn-500/40 bg-warn-500/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-warn-400">
              {error}
            </div>
          )}
        </aside>

        {/* 右侧预览区 */}
        <section className="flex-1 overflow-hidden">
          <PreviewPanel />
        </section>
      </main>

      <Toast />
    </div>
  );
}
