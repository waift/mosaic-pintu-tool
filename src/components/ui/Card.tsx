import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "panel" | "card";

// 对齐 docs/设计规范.md §3.4
const VARIANT: Record<Variant, string> = {
  // 配置区面板
  panel: "border border-base-500 bg-base-700/40 rounded p-4",
  // 缩略图 / 浮层卡片
  card: "border border-base-500 bg-base-700 rounded overflow-hidden hover:shadow-lift",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

/** 统一表面容器:面板 / 卡片。业务特定 padding 等通过 className 追加。 */
export function Card({ variant = "panel", className, ...props }: CardProps) {
  return <div className={cn(VARIANT[variant], className)} {...props} />;
}

export default Card;
