import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

// 颜色 token 全部取自设计规范合法白名单,勿在此引入未定义档位
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent-500 text-base-900 shadow-accent-glow hover:bg-accent-600",
  secondary: "text-ink-200 hover:bg-base-700 hover:text-ink-100",
  danger: "bg-warn-500/90 text-white hover:bg-warn-600",
};

const SIZE: Record<Size, string> = {
  // sm: 工具条 / 弹窗内联按钮
  sm: "px-2.5 py-1.5 font-mono text-[11px]",
  // md: 主操作(生成长图 / 下载)
  md: "px-4 py-3 font-display text-sm font-medium hover:-translate-y-0.5",
};

const DISABLED: Record<Variant, string> = {
  primary: "disabled:bg-base-700 disabled:text-ink-200 disabled:shadow-none",
  secondary: "disabled:opacity-30",
  danger: "disabled:bg-base-700 disabled:text-ink-200 disabled:opacity-40",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * 统一按钮:对齐 docs/设计规范.md §3.1 三档写法,消灭散落 class 串。
 * 默认 type="button",避免意外触发表单提交。
 */
export function Button({
  variant = "secondary",
  size = "sm",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded transition-colors",
        "cursor-pointer disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        DISABLED[variant],
        className,
      )}
      {...props}
    />
  );
}

export default Button;
