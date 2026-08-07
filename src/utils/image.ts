import exifr from "exifr";
import { LIMITS, type ImageItem, type StitchConfig } from "@/types";

/** 生成唯一 id */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * 根据 EXIF orientation 计算"实际显示宽高"
 * orientation 取值 1-8,其中 5/6/7/8 表示需要旋转 90°/270°,宽高互换
 * 参考:https://exiftool.org/TagNames/EXIF.html
 */
export function applyOrientationSize(
  w: number,
  h: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: h, height: w };
  }
  return { width: w, height: h };
}

/**
 * 读取文件并解码为 ImageBitmap,同时读取 EXIF orientation
 * 返回解码后的位图与修正后的实际尺寸
 */
export async function decodeImage(
  file: File,
): Promise<{ bitmap: ImageBitmap; orientation: number; width: number; height: number }> {
  let orientation = 1;
  try {
    const exif = await exifr.orientation(file);
    if (typeof exif === "number" && exif >= 1 && exif <= 8) {
      orientation = exif;
    }
  } catch {
    // 非 JPG 或无 EXIF,默认 1
    orientation = 1;
  }

  const bitmap = await createImageBitmap(file);

  // applyOrientationSize 根据 orientation 计算实际显示宽高
  const { width, height } = applyOrientationSize(
    bitmap.width,
    bitmap.height,
    orientation,
  );
  return { bitmap, orientation, width, height };
}

/**
 * 校验文件:数量 + 单图最长边
 * 返回错误信息(null 表示通过)
 */
export function validateFiles(
  files: File[],
  currentCount: number,
): { valid: File[]; errors: string[] } {
  const errors: string[] = [];
  const valid: File[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      errors.push(`"${file.name}" 不是图片文件`);
      continue;
    }
    valid.push(file);
  }

  // 数量校验
  const remain = LIMITS.maxCount - currentCount;
  if (valid.length > remain) {
    if (remain <= 0) {
      errors.push(`已达上限 ${LIMITS.maxCount} 张,请先删除部分图片`);
      return { valid: [], errors };
    }
    errors.push(
      `超出数量上限,仅保留前 ${remain} 张(上限 ${LIMITS.maxCount} 张)`,
    );
    valid.splice(remain);
  }

  return { valid, errors };
}

/**
 * 同步校验已解码位图的最长边
 * 返回通过校验的位图列表
 */
export function filterBySize(
  items: { file: File; bitmap: ImageBitmap; orientation: number; width: number; height: number }[],
): { accepted: ImageItem[]; rejected: string[] } {
  const accepted: ImageItem[] = [];
  const rejected: string[] = [];

  for (const item of items) {
    const longestSide = Math.max(item.width, item.height);
    if (longestSide > LIMITS.maxSide) {
      rejected.push(
        `"${item.file.name}" 最长边 ${longestSide}px 超过 ${LIMITS.maxSide}px 上限`,
      );
      item.bitmap.close();
      continue;
    }
    accepted.push({
      id: uid(),
      file: item.file,
      thumbUrl: URL.createObjectURL(item.file),
      width: item.width,
      height: item.height,
      orientation: item.orientation,
    });
  }

  return { accepted, rejected };
}

/**
 * 将带 EXIF 方向的 ImageBitmap 绘制到 Canvas,得到方向正确的 Canvas
 */
export function bitmapToOrientedCanvas(
  bitmap: ImageBitmap,
  orientation: number,
): HTMLCanvasElement {
  const { width, height } = applyOrientationSize(
    bitmap.width,
    bitmap.height,
    orientation,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.translate(width / 2, height / 2);

  // 根据 EXIF orientation 应用 transform
  switch (orientation) {
    case 2:
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    case 6:
      ctx.rotate(Math.PI / 2);
      break;
    case 7:
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 8:
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }

  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();
  return canvas;
}

/** 计算拼接后的总尺寸与每张图的目标绘制尺寸 */
export interface StitchPlan {
  totalWidth: number;
  totalHeight: number;
  targets: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }[];
}

/**
 * 计算拼接布局:以最大尺寸为基准,等比放大其他图
 */
export function planStitch(
  images: ImageItem[],
  config: StitchConfig,
  bitmaps: Map<string, ImageBitmap>,
): StitchPlan {
  const { direction, gap } = config;

  // 1. 确定基准尺寸
  let baseSize: number;
  if (direction === "vertical") {
    baseSize = Math.max(...images.map((img) => img.width));
  } else {
    baseSize = Math.max(...images.map((img) => img.height));
  }

  // 2. 等比放大计算每张图的目标尺寸
  const targets = images.map((img) => {
    if (direction === "vertical") {
      const scale = baseSize / img.width;
      return { id: img.id, w: baseSize, h: img.height * scale };
    } else {
      const scale = baseSize / img.height;
      return { id: img.id, w: img.width * scale, h: baseSize };
    }
  });

  // 3. 计算总画布尺寸(含间距)
  const gapTotal = gap * (images.length - 1);
  let totalWidth: number;
  let totalHeight: number;
  if (direction === "vertical") {
    totalWidth = baseSize;
    totalHeight = targets.reduce((sum, t) => sum + t.h, 0) + gapTotal;
  } else {
    totalWidth = targets.reduce((sum, t) => sum + t.w, 0) + gapTotal;
    totalHeight = baseSize;
  }

  // 4. 计算每张图的位置,并预生成方向修正后的 canvas
  let cursor = 0;
  const items = images.map((img, idx) => {
    const target = targets[idx];
    const bitmap = bitmaps.get(img.id)!;
    const orientedCanvas = bitmapToOrientedCanvas(bitmap, img.orientation);
    let x: number;
    let y: number;
    if (direction === "vertical") {
      x = 0;
      y = cursor;
      cursor += target.h + gap;
    } else {
      x = cursor;
      y = 0;
      cursor += target.w + gap;
    }
    return {
      canvas: orientedCanvas,
      x,
      y,
      w: target.w,
      h: target.h,
    };
  });

  return { totalWidth, totalHeight, targets: items };
}

/**
 * 把 hex 颜色转换为 rgba 字符串
 * 支持 #rgb / #rrggbb / #rrggbbaa
 */
export function hexToRgba(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** 执行拼接并导出为 Blob */
export async function stitchAndExport(
  images: ImageItem[],
  config: StitchConfig,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (images.length === 0) {
    throw new Error("请先添加图片");
  }

  // 1. 解码所有图片为 ImageBitmap
  const bitmaps = new Map<string, ImageBitmap>();
  try {
    for (const img of images) {
      const bitmap = await createImageBitmap(img.file);
      bitmaps.set(img.id, bitmap);
    }

    // 2. 计算布局
    const plan = planStitch(images, config, bitmaps);

    // 3. Canvas 尺寸上限校验
    if (
      plan.totalWidth > LIMITS.canvasMaxSide ||
      plan.totalHeight > LIMITS.canvasMaxSide
    ) {
      throw new Error(
        `拼接后总尺寸 ${Math.round(plan.totalWidth)}×${Math.round(
          plan.totalHeight,
        )} 超出浏览器 Canvas 上限(${LIMITS.canvasMaxSide}px),请减少图片数量或缩小图片尺寸`,
      );
    }

    // 4. 创建总画布
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(plan.totalWidth);
    canvas.height = Math.round(plan.totalHeight);
    const ctx = canvas.getContext("2d")!;

    // 5. 填充背景(JPG 不支持透明 → 强制不透明)
    const useTransparent =
      config.transparent && config.format !== "jpeg";
    if (!useTransparent) {
      ctx.fillStyle =
        config.format === "jpeg"
          ? "#ffffff"
          : hexToRgba(config.bgColor);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 6. 依次绘制每张图
    for (const target of plan.targets) {
      ctx.drawImage(target.canvas, target.x, target.y, target.w, target.h);
    }

    // 7. 导出为 Blob
    const mime =
      config.format === "png"
        ? "image/png"
        : config.format === "jpeg"
          ? "image/jpeg"
          : "image/webp";

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("导出失败,请重试"));
        },
        mime,
        config.format === "png" ? undefined : config.quality / 100,
      );
    });

    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    // 释放所有 ImageBitmap
    bitmaps.forEach((bmp) => bmp.close());
  }
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
