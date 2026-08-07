import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, ImageOff, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useStitchStore } from "@/store/stitchStore";
import { downloadBlob } from "@/utils/image";
import { FORMAT_LABELS } from "@/types";
import { cn } from "@/lib/utils";

/**
 * 右侧预览与下载区
 * 生成前:占位说明
 * 生成后:默认自适应画布(一眼看全貌),可滚轮缩放/拖拽平移
 */
export default function PreviewPanel() {
  const result = useStitchStore((s) => s.result);
  const status = useStitchStore((s) => s.status);
  const error = useStitchStore((s) => s.error);

  return (
    <div className="flex h-full flex-col">
      {status === "idle" && !result && <EmptyState />}
      {status === "generating" && <GeneratingState />}
      {status === "error" && <ErrorState message={error} />}
      {result && status !== "generating" && <ResultView result={result} />}
    </div>
  );
}

/* ==================== 空态 ==================== */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-700/50 text-ink-200">
        <ImageOff size={28} strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-sm font-medium text-ink-100">
        还没有生成结果
      </h3>
      <p className="mt-2 max-w-xs font-mono text-[11px] leading-relaxed text-ink-200">
        1. 上传图片(支持点击/拖拽/粘贴)<br />
        2. 调整方向、间距、格式<br />
        3. 点击「生成长图」
      </p>
      <p className="mt-4 font-mono text-[10px] text-ink-200/60">
        所有处理在浏览器本地完成,图片不会上传
      </p>
    </div>
  );
}

/* ==================== 生成中 ==================== */
function GeneratingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="h-8 w-8 animate-spin-slow rounded-full border-2 border-base-500 border-t-accent-500" />
      <p className="mt-4 font-mono text-xs text-ink-100">生成中…</p>
    </div>
  );
}

/* ==================== 错误态 ==================== */
function ErrorState({ message }: { message: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warn-500/10 text-warn-500">
        <ImageOff size={28} strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-sm font-medium text-warn-400">
        生成失败
      </h3>
      <p className="mt-2 max-w-sm font-mono text-[11px] leading-relaxed text-ink-200">
        {message ?? "未知错误"}
      </p>
    </div>
  );
}

/* ==================== 结果态 ==================== */
function ResultView({
  result,
}: {
  result: NonNullable<ReturnType<typeof useStitchStore.getState>["result"]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFit, setIsFit] = useState(true);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  /** 计算自适应缩放:让图片完整显示在容器内,留 8% 边距 */
  const computeFit = useCallback(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return 1;
    const sx = containerSize.w / result.width;
    const sy = containerSize.h / result.height;
    return Math.min(sx, sy) * 0.92;
  }, [containerSize, result.width, result.height]);

  /** 测量容器尺寸 + 监听变化(仅在结果态挂载) */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** 容器尺寸或结果变化时,若处于自适应状态则重新计算 */
  useEffect(() => {
    if (isFit) {
      setScale(computeFit());
      setOffset({ x: 0, y: 0 });
    }
  }, [computeFit, isFit, result]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setIsFit(false);
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(8, Math.max(0.05, s * (1 + delta))));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsFit(false);
    draggingRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    setOffset({
      x: e.clientX - draggingRef.current.x,
      y: e.clientY - draggingRef.current.y,
    });
  };
  const onMouseUp = () => {
    draggingRef.current = null;
  };

  /** 回到自适应 */
  const fitToCanvas = () => {
    setIsFit(true);
    setScale(computeFit());
    setOffset({ x: 0, y: 0 });
  };

  const onDownload = () => {
    const ext = result.format === "jpeg" ? "jpg" : result.format;
    downloadBlob(result.blob, `mosaic_${Date.now()}.${ext}`);
  };

  return (
    <>
      {/* 工具条 */}
      <div className="flex items-center justify-between border-b border-base-500 px-4 py-2">
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-200">
          <span>
            {result.width}×{result.height}px
          </span>
          <span className="text-base-400">·</span>
          <span>{FORMAT_LABELS[result.format]}</span>
          <span className="text-base-400">·</span>
          <span>{(result.blob.size / 1024).toFixed(1)} KB</span>
          <span className="text-base-400">·</span>
          <span>{Math.round(scale * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsFit(false);
              setScale((s) => Math.max(0.05, s / 1.2));
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-200 hover:bg-base-700 hover:text-ink-100"
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              setIsFit(false);
              setScale((s) => Math.min(8, s * 1.2));
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-200 hover:bg-base-700 hover:text-ink-100"
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          {/* 自适应画布按钮 */}
          <button
            onClick={fitToCanvas}
            className={cn(
              "ml-1 flex h-7 items-center gap-1.5 rounded px-2 font-mono text-[11px] transition-colors",
              isFit
                ? "bg-accent-500/15 text-accent-500"
                : "text-ink-200 hover:bg-base-700 hover:text-ink-100",
            )}
            title="自适应画布"
          >
            <Maximize size={13} />
            自适应
          </button>
        </div>
      </div>

      {/* 预览画布(透明指示棋盘格,跟随主题) */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={cn(
          "relative flex-1 overflow-hidden",
          "cursor-grab active:cursor-grabbing",
        )}
        style={{
          backgroundColor: "rgb(var(--c-base-800))",
          backgroundImage:
            "linear-gradient(45deg, rgb(var(--c-ink-50) / 0.04) 25%, transparent 25%), linear-gradient(-45deg, rgb(var(--c-ink-50) / 0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(var(--c-ink-50) / 0.04) 75%), linear-gradient(-45deg, transparent 75%, rgb(var(--c-ink-50) / 0.04) 75%)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: draggingRef.current ? "none" : "transform 0.12s ease-out",
          }}
        >
          <img
            src={result.previewUrl}
            alt="预览"
            className="max-w-none shadow-lift"
            draggable={false}
          />
        </div>
      </div>

      {/* 下载条 */}
      <div className="flex items-center justify-between border-t border-base-500 px-4 py-3">
        <div className="font-mono text-[11px] text-ink-200">
          滚轮缩放 · 拖拽平移 · 默认自适应
        </div>
        <button
          onClick={onDownload}
          className={cn(
            "flex items-center gap-2 rounded px-4 py-2",
            "bg-accent-500 font-display text-xs font-medium text-base-900",
            "shadow-accent-glow transition-transform hover:-translate-y-0.5",
          )}
        >
          <Download size={14} strokeWidth={2.5} />
          下载图片
        </button>
      </div>
    </>
  );
}
