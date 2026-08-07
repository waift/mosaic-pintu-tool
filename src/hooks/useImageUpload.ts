import { useCallback } from "react";
import { useStitchStore } from "@/store/stitchStore";
import { decodeImage, filterBySize, validateFiles } from "@/utils/image";
import { LIMITS } from "@/types";

/**
 * 统一处理文件输入(来自 input/drop/paste)
 * 校验 → 解码 → 尺寸过滤 → 入库
 */
export function useImageUpload() {
  const addImages = useStitchStore((s) => s.addImages);
  const showToast = useStitchStore((s) => s.showToast);
  const images = useStitchStore((s) => s.images);

  return useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // 1. 同步数量与类型校验
      const { valid, errors } = validateFiles(files, images.length);
      if (errors.length > 0) {
        showToast(errors.join(";"));
      }
      if (valid.length === 0) return;

      // 2. 解码 + EXIF 读取
      const decoded = await Promise.all(
        valid.map(async (file) => {
          try {
            const info = await decodeImage(file);
            return { file, ...info };
          } catch {
            showToast(`"${file.name}" 解码失败`);
            return null;
          }
        }),
      );

      const ok = decoded.filter(
        (d): d is NonNullable<typeof d> => d !== null,
      );

      // 3. 尺寸校验
      const { accepted, rejected } = filterBySize(ok);
      if (rejected.length > 0) {
        showToast(rejected.join(";"));
      }

      // 4. 入库
      if (accepted.length > 0) {
        addImages(accepted);
        showToast(
          `已添加 ${accepted.length} 张图片(共 ${images.length + accepted.length}/${LIMITS.maxCount})`,
        );
      }
    },
    [addImages, images.length, showToast],
  );
}
