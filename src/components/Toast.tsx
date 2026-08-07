import { useEffect } from "react";
import { useStitchStore } from "@/store/stitchStore";
import { cn } from "@/lib/utils";

/** 全局 Toast(单条,2.4s 自动消失) */
export default function Toast() {
  const toast = useStitchStore((s) => s.toast);
  const clearToast = useStitchStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2400);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className={cn(
          "pointer-events-auto animate-fade-in rounded border border-base-500 bg-base-700/95 px-4 py-2.5",
          "shadow-lift backdrop-blur",
          "font-mono text-[12px] text-ink-50",
        )}
      >
        {toast}
      </div>
    </div>
  );
}
