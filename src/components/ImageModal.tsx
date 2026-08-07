import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** 原图查看模态:点击缩略图后弹出,显示原图,点击/ESC 关闭 */
export default function ImageModal({
  src,
  name,
  onClose,
}: {
  src: string;
  name?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // 锁定背景滚动
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/80 p-8 backdrop-blur-sm animate-fade-in"
    >
      <button
        onClick={onClose}
        className={cn(
          "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full",
          "bg-base-700/80 text-ink-100 hover:bg-base-600 hover:text-ink-50",
        )}
        title="关闭 (ESC)"
      >
        <X size={18} />
      </button>

      <img
        src={src}
        alt={name ?? "原图"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded shadow-lift"
        draggable={false}
      />

      {name && (
        <div className="absolute bottom-4 left-1/2 max-w-[80%] -translate-x-1/2 truncate rounded bg-base-700/80 px-3 py-1.5 font-mono text-[11px] text-ink-100">
          {name}
        </div>
      )}
    </div>
  );
}
