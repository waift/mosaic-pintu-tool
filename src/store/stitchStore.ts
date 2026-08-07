import { create } from "zustand";
import {
  type ImageItem,
  type StitchConfig,
  type GenStatus,
  type GenResult,
  DEFAULT_CONFIG,
} from "@/types";

interface StitchStore {
  /** 图片列表(顺序即拼接顺序) */
  images: ImageItem[];
  /** 拼接配置 */
  config: StitchConfig;
  /** 生成状态 */
  status: GenStatus;
  /** 生成结果 */
  result: GenResult | null;
  /** 错误信息 */
  error: string | null;
  /** Toast 提示(单条,自动消失) */
  toast: string | null;

  /** 追加图片(已校验过尺寸) */
  addImages: (items: ImageItem[]) => void;
  /** 删除指定图片 */
  removeImage: (id: string) => void;
  /** 重排图片顺序 */
  reorderImages: (from: number, to: number) => void;
  /** 直接替换列表(用于 dnd-kit 排序) */
  setImages: (items: ImageItem[]) => void;
  /** 更新配置(部分) */
  updateConfig: (patch: Partial<StitchConfig>) => void;
  /** 设置生成状态 */
  setStatus: (status: GenStatus) => void;
  /** 设置生成结果 */
  setResult: (result: GenResult | null) => void;
  /** 设置错误 */
  setError: (error: string | null) => void;
  /** 弹 toast */
  showToast: (msg: string) => void;
  /** 清空 toast */
  clearToast: () => void;
  /** 重置全部 */
  reset: () => void;
}

export const useStitchStore = create<StitchStore>((set) => ({
  images: [],
  config: DEFAULT_CONFIG,
  status: "idle",
  result: null,
  error: null,
  toast: null,

  addImages: (items) =>
    set((state) => ({ images: [...state.images, ...items] })),

  removeImage: (id) =>
    set((state) => ({ images: state.images.filter((img) => img.id !== id) })),

  reorderImages: (from, to) =>
    set((state) => {
      const next = [...state.images];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { images: next };
    }),

  setImages: (items) => set({ images: items }),

  updateConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),

  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),

  reset: () =>
    set({
      images: [],
      status: "idle",
      result: null,
      error: null,
      toast: null,
      config: DEFAULT_CONFIG,
    }),
}));
