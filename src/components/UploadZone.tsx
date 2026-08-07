import { useRef, useState, type DragEvent } from "react";
import { Upload, MousePointerClick, Clipboard, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useStitchStore } from "@/store/stitchStore";
import { LIMITS } from "@/types";

/**
 * 上传区:单击 = 从剪贴板粘贴,双击 = 打开文件选择,拖拽 = 上传
 * 注:全局 Ctrl+V 粘贴在 Home.tsx 监听
 */
export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handleFiles = useImageUpload();
  const showToast = useStitchStore((s) => s.showToast);

  const onDoubleClick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  /** 单击:读取剪贴板里的图片 */
  const onClick = async () => {
    try {
      if (!navigator.clipboard?.read) {
        showToast("当前浏览器不支持读取剪贴板,请用 Ctrl+V 或双击上传");
        return;
      }
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard-${Date.now()}.${imageType.split("/")[1]}`, { type: imageType }));
        }
      }
      if (files.length === 0) {
        showToast("剪贴板里没有图片");
      } else {
        handleFiles(files);
      }
    } catch {
      showToast("读取剪贴板失败,请用 Ctrl+V 或双击上传");
    }
  };

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

  return (
    <div
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
            dragging
              ? "bg-accent-500/20 text-accent-400"
              : "bg-base-600 text-ink-200 group-hover:text-ink-100",
          )}
        >
          <Upload size={20} strokeWidth={2} />
        </div>

        <div className="font-display text-sm font-medium text-ink-50">
          {dragging ? "松开即可上传" : "单击粘贴 · 双击上传 · 拖拽放入"}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-ink-200">
          <span className="flex items-center gap-1">
            <MousePointerClick size={12} /> 双击
          </span>
          <span className="flex items-center gap-1">
            <Upload size={12} /> 拖拽
          </span>
          <span className="flex items-center gap-1">
            <Clipboard size={12} /> 单击/Ctrl+V
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
