import { useEffect, useRef, useState, type DragEvent } from "react";
import { Upload, MousePointerClick, Clipboard, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUpload } from "@/hooks/useImageUpload";
import { LIMITS } from "@/types";

/**
 * 上传区:单击 = 高亮进入「待粘贴」态(不再自动读剪贴板),等待 Ctrl+V 贴入;
 *       双击 = 打开文件选择;拖拽 = 上传。
 * 注:全局 Ctrl+V 粘贴在 Home.tsx 监听,任何时候按都能粘贴;单击只是给导入区一个视觉引导。
 */
export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false); // 单击高亮「待粘贴」态
  const handleFiles = useImageUpload();

  const onDoubleClick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  /** 单击:仅切换「待粘贴」高亮态,不读取剪贴板(剪贴板由 Ctrl+V 触发) */
  const onClick = () => setArmed((a) => !a);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  // 待粘贴态的解除:粘贴成功 / 点击页面其它位置 / 按 Esc
  useEffect(() => {
    if (!armed) return;
    const onPaste = () => setArmed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    const onDocClick = (e: MouseEvent) => {
      if (!zoneRef.current?.contains(e.target as Node)) setArmed(false);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClick, true);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick, true);
    };
  }, [armed]);

  return (
    <div
      ref={zoneRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "group relative cursor-pointer rounded border-2 border-dashed transition-all",
        "px-4 py-6 text-center select-none",
        dragging
          ? "border-accent-500 bg-accent-500/5 shadow-accent-glow"
          : armed
            ? "border-accent-500 bg-accent-500/10 ring-2 ring-accent-500/50"
            : "border-base-500 hover:border-base-400 hover:bg-base-700/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            dragging || armed
              ? "bg-accent-500/20 text-accent-400"
              : "bg-base-600 text-ink-200 group-hover:text-ink-100",
          )}
        >
          <Upload size={20} strokeWidth={2} />
        </div>

        <div className="font-display text-sm font-medium text-ink-50">
          {dragging
            ? "松开即可上传"
            : armed
              ? "按 Ctrl+V 粘贴图片"
              : "单击就绪 · 双击上传 · 拖拽放入"}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-ink-200">
          <span className="flex items-center gap-1">
            <MousePointerClick size={12} /> 单击就绪
          </span>
          <span className="flex items-center gap-1">
            <MousePointerClick size={12} /> 双击
          </span>
          <span className="flex items-center gap-1">
            <Upload size={12} /> 拖拽
          </span>
          <span className="flex items-center gap-1">
            <Clipboard size={12} /> Ctrl+V
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-200/70">
          <ImageIcon size={10} />
          最多 {LIMITS.maxCount} 张 · 单图最长边 ≤ {LIMITS.maxSide}px · 自动修正方向
        </div>
      </div>
    </div>
  );
}
