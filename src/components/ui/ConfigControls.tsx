import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** 配置分组:默认标题与内容上下排列 */
export function ConfigGroup({
  label,
  children,
  hint,
  inline = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  /** true: 标题与内容同一行(适合 Segmented 这类控件) */
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="shrink-0 font-display text-xs font-medium text-ink-100">
          {label}
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">{children}</div>
          {hint && (
            <span className="shrink-0 font-mono text-[10px] text-ink-200">
              {hint}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="font-display text-xs font-medium text-ink-100">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[10px] text-ink-200">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** 切换按钮组 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded bg-base-900/60 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded px-3 py-1.5 font-mono text-[11px] transition-all",
            value === opt.value
              ? "bg-accent-500 text-base-900 font-medium shadow-accent-glow"
              : "text-ink-200 hover:text-ink-100",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
