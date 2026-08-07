import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 原图查看模态:点击缩略图后弹出,显示原图,点击/ESC 关闭 */
export default function ImageModal({
  src,
  name,
  onClose,
  index,
  total,
  onPrev,
  onNext,
}: {
  src: string;
  name?: string;
  onClose: () => void;
  index?: number;
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    // 锁定背景滚动
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-base-900/80 p-8 backdrop-blur-sm animate-fade-in"
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

      {onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-base-700/80 text-ink-100 transition-colors hover:bg-base-600 hover:text-ink-50"
          title="上一张 (←)"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-base-700/80 text-ink-100 transition-colors hover:bg-base-600 hover:text-ink-50"
          title="下一张 (→)"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <img
        src={src}
        alt={name ?? "原图"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded shadow-lift"
        draggable={false}
      />

      {(name || total != null) && (
        <div className="absolute bottom-4 left-1/2 max-w-[80%] -translate-x-1/2 truncate rounded bg-base-700/80 px-3 py-1.5 font-mono text-[11px] text-ink-100">
          {name}
          {total != null ? ` · ${index} / ${total}` : ""}
        </div>
      )}
    </div>
  );
}
