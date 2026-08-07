// 拼图工具核心类型定义

/** 拼接方向:垂直/水平 */
export type Direction = "vertical" | "horizontal";

/** 输出格式 */
export type OutputFormat = "png" | "jpeg" | "webp";

/** 用户可显示标签 */
export type LabelMap<T extends string> = Record<T, string>;

/** 图片项:对应一张已上传图片 */
export interface ImageItem {
  /** 唯一标识 */
  id: string;
  /** 原始 File 对象 */
  file: File;
  /** 缩略图 ObjectURL(用于列表展示) */
  thumbUrl: string;
  /** EXIF 修正后的实际宽度 */
  width: number;
  /** EXIF 修正后的实际高度 */
  height: number;
  /** EXIF orientation 值 */
  orientation: number;
}

/** 拼接配置 */
export interface StitchConfig {
  /** 拼接方向 */
  direction: Direction;
  /** 图片间距(px) */
  gap: number;
  /** 背景色(支持透明,如 #00e0c680) */
  bgColor: string;
  /** 是否透明背景(仅 PNG 生效) */
  transparent: boolean;
  /** 输出格式 */
  format: OutputFormat;
  /** 质量 0-100(仅 JPG/WebP) */
  quality: number;
}

/** 生成状态 */
export type GenStatus = "idle" | "generating" | "done" | "error";

/** 生成结果 */
export interface GenResult {
  /** 结果 Blob */
  blob: Blob;
  /** 预览 ObjectURL */
  previewUrl: string;
  /** 结果宽度 */
  width: number;
  /** 结果高度 */
  height: number;
  /** 输出格式 */
  format: OutputFormat;
}

/** 工具内置限制常量 */
export const LIMITS = {
  /** 图片数量上限 */
  maxCount: 30,
  /** 单图最长边上限(px) */
  maxSide: 8000,
  /** Canvas 单边尺寸上限(保守值) */
  canvasMaxSide: 16000,
} as const;

/** 默认拼接配置 */
export const DEFAULT_CONFIG: StitchConfig = {
  direction: "vertical",
  gap: 0,
  bgColor: "#1a1a1f",
  transparent: false,
  format: "png",
  quality: 92,
};

/** 方向标签 */
export const DIRECTION_LABELS: LabelMap<Direction> = {
  vertical: "垂直拼接",
  horizontal: "水平拼接",
};

/** 格式标签 */
export const FORMAT_LABELS: LabelMap<OutputFormat> = {
  png: "PNG",
  jpeg: "JPG",
  webp: "WebP",
};
