import { describe, it, expect } from "vitest";
import {
  uid,
  applyOrientationSize,
  validateFiles,
  filterBySize,
  bitmapToOrientedCanvas,
  planStitch,
  hexToRgba,
} from "@/utils/image";
import { LIMITS, DEFAULT_CONFIG, type ImageItem, type StitchConfig } from "@/types";
import { getStubCalls } from "@/test/setup";

// ---------- 测试替身 ----------

/** 造一个带指定 MIME 的 File */
function makeFile(name: string, type = "image/png"): File {
  return new File(["x"], name, { type });
}

/** 造一个最小可用的 ImageBitmap 替身(planStitch/filterBySize 只用到 width/height/close) */
function makeBitmap(width: number, height: number) {
  let closed = false;
  return {
    width,
    height,
    close() {
      closed = true;
    },
    get closed() {
      return closed;
    },
  } as unknown as ImageBitmap & { closed: boolean };
}

/** 造一个 ImageItem */
function makeItem(id: string, width: number, height: number, orientation = 1): ImageItem {
  return {
    id,
    file: makeFile(`${id}.png`),
    thumbUrl: `blob:${id}`,
    width,
    height,
    orientation,
  };
}

// ---------- uid ----------

describe("uid", () => {
  it("连续生成 1000 个 id 不重复", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(uid());
    expect(set.size).toBe(1000);
  });

  it("只含 base36 字符,便于用作 DOM id / dnd-kit key", () => {
    expect(uid()).toMatch(/^[0-9a-z]+$/);
  });
});

// ---------- applyOrientationSize ----------

describe("applyOrientationSize", () => {
  // EXIF 1-4 只涉及翻转/180°旋转,宽高不变
  it.each([1, 2, 3, 4])("orientation %i 保持宽高不变", (o) => {
    expect(applyOrientationSize(400, 300, o)).toEqual({ width: 400, height: 300 });
  });

  // EXIF 5-8 涉及 90°/270° 旋转,宽高互换
  it.each([5, 6, 7, 8])("orientation %i 宽高互换", (o) => {
    expect(applyOrientationSize(400, 300, o)).toEqual({ width: 300, height: 400 });
  });

  it("边界:4 不换、5 换(守住 >=5 && <=8 的下界)", () => {
    expect(applyOrientationSize(400, 300, 4).width).toBe(400);
    expect(applyOrientationSize(400, 300, 5).width).toBe(300);
  });

  it("边界:8 换、9 不换(守住上界,异常值按不旋转兜底)", () => {
    expect(applyOrientationSize(400, 300, 8).width).toBe(300);
    expect(applyOrientationSize(400, 300, 9).width).toBe(400);
    expect(applyOrientationSize(400, 300, 0).width).toBe(400);
  });

  it("正方形图任何方向结果都相同", () => {
    for (let o = 1; o <= 8; o++) {
      expect(applyOrientationSize(500, 500, o)).toEqual({ width: 500, height: 500 });
    }
  });
});

// ---------- validateFiles ----------

describe("validateFiles", () => {
  it("全部是图片且未超量时,原样通过", () => {
    const files = [makeFile("a.png"), makeFile("b.jpg", "image/jpeg")];
    const r = validateFiles(files, 0);
    expect(r.valid).toHaveLength(2);
    expect(r.errors).toEqual([]);
  });

  it("过滤非图片文件并给出文件名提示", () => {
    const files = [makeFile("a.png"), makeFile("readme.txt", "text/plain")];
    const r = validateFiles(files, 0);
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("readme.txt");
  });

  it("正好填满 30 张上限时不报错", () => {
    const files = Array.from({ length: 10 }, (_, i) => makeFile(`f${i}.png`));
    const r = validateFiles(files, LIMITS.maxCount - 10);
    expect(r.valid).toHaveLength(10);
    expect(r.errors).toEqual([]);
  });

  it("超出上限时截断到剩余额度,并提示保留了几张", () => {
    const files = Array.from({ length: 5 }, (_, i) => makeFile(`f${i}.png`));
    const r = validateFiles(files, LIMITS.maxCount - 2); // 只剩 2 个名额
    expect(r.valid).toHaveLength(2);
    expect(r.errors[0]).toContain("仅保留前 2 张");
  });

  it("已达上限时全部拒绝", () => {
    const files = [makeFile("a.png")];
    const r = validateFiles(files, LIMITS.maxCount);
    expect(r.valid).toEqual([]);
    expect(r.errors[0]).toContain("已达上限");
  });

  it("空输入不报错", () => {
    expect(validateFiles([], 0)).toEqual({ valid: [], errors: [] });
  });
});

// ---------- filterBySize ----------

describe("filterBySize", () => {
  function entry(name: string, width: number, height: number, orientation = 1) {
    return {
      file: makeFile(name),
      bitmap: makeBitmap(width, height),
      orientation,
      width,
      height,
    };
  }

  it("最长边未超限的图片全部保留,并补齐 id/thumbUrl", () => {
    const r = filterBySize([entry("a.png", 800, 600)]);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected).toEqual([]);
    expect(r.accepted[0].id).toBeTruthy();
    expect(r.accepted[0].thumbUrl).toBeTruthy();
    expect(r.accepted[0].width).toBe(800);
  });

  it("最长边正好等于 8000 时通过(边界不能误伤)", () => {
    const r = filterBySize([entry("edge.png", LIMITS.maxSide, 100)]);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected).toEqual([]);
  });

  it("最长边超过 8000 时拒绝,并释放位图避免内存泄漏", () => {
    const e = entry("huge.png", LIMITS.maxSide + 1, 100);
    const r = filterBySize([e]);
    expect(r.accepted).toEqual([]);
    expect(r.rejected[0]).toContain("huge.png");
    // 被拒绝的位图必须 close,否则大图会一直占着内存
    expect((e.bitmap as unknown as { closed: boolean }).closed).toBe(true);
  });

  it("高度方向超限同样能拦住(取的是最长边不是宽)", () => {
    const r = filterBySize([entry("tall.png", 100, LIMITS.maxSide + 1)]);
    expect(r.accepted).toEqual([]);
    expect(r.rejected).toHaveLength(1);
  });

  it("混合输入时通过与拒绝各归各位", () => {
    const r = filterBySize([
      entry("ok1.png", 500, 500),
      entry("bad.png", 9000, 100),
      entry("ok2.png", 600, 400),
    ]);
    expect(r.accepted).toHaveLength(2);
    expect(r.rejected).toHaveLength(1);
  });

  it("每张图分到不同的 id", () => {
    const r = filterBySize([entry("a.png", 100, 100), entry("b.png", 100, 100)]);
    expect(r.accepted[0].id).not.toBe(r.accepted[1].id);
  });
});

// ---------- hexToRgba ----------

describe("hexToRgba", () => {
  it("解析 #rrggbb", () => {
    expect(hexToRgba("#1a1a1f")).toBe("rgba(26, 26, 31, 1)");
  });

  it("解析不带 # 的写法", () => {
    expect(hexToRgba("ffffff")).toBe("rgba(255, 255, 255, 1)");
  });

  it("三位缩写 #abc 展开为 #aabbcc", () => {
    expect(hexToRgba("#abc")).toBe("rgba(170, 187, 204, 1)");
  });

  it("八位带 alpha:#00e0c680 → alpha≈0.502", () => {
    const s = hexToRgba("#00e0c680");
    expect(s.startsWith("rgba(0, 224, 198,")).toBe(true);
    const alpha = Number(s.match(/,\s*([\d.]+)\)$/)![1]);
    expect(alpha).toBeCloseTo(0.502, 3);
  });

  it("alpha 为 00 时完全透明", () => {
    expect(hexToRgba("#11223300")).toBe("rgba(17, 34, 51, 0)");
  });

  it("纯黑与纯白", () => {
    expect(hexToRgba("#000000")).toBe("rgba(0, 0, 0, 1)");
    expect(hexToRgba("#FFFFFF")).toBe("rgba(255, 255, 255, 1)");
  });
});

// ---------- bitmapToOrientedCanvas ----------

describe("bitmapToOrientedCanvas", () => {
  it("orientation 1:画布尺寸等于原图,无旋转/翻转", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 1);
    expect([c.width, c.height]).toEqual([400, 300]);
    const methods = getStubCalls(c).map((x) => x.method);
    expect(methods).not.toContain("rotate");
    expect(methods).not.toContain("scale");
  });

  it("orientation 6:画布宽高互换并旋转 90°", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 6);
    expect([c.width, c.height]).toEqual([300, 400]);
    const rotate = getStubCalls(c).find((x) => x.method === "rotate");
    expect(rotate?.args[0]).toBeCloseTo(Math.PI / 2, 6);
  });

  it("orientation 8:旋转 -90°", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 8);
    expect([c.width, c.height]).toEqual([300, 400]);
    const rotate = getStubCalls(c).find((x) => x.method === "rotate");
    expect(rotate?.args[0]).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("orientation 3:旋转 180°,尺寸不变", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 3);
    expect([c.width, c.height]).toEqual([400, 300]);
    const rotate = getStubCalls(c).find((x) => x.method === "rotate");
    expect(rotate?.args[0]).toBeCloseTo(Math.PI, 6);
  });

  it("orientation 2:水平镜像(scale(-1,1)),无旋转", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 2);
    const calls = getStubCalls(c);
    expect(calls.find((x) => x.method === "scale")?.args).toEqual([-1, 1]);
    expect(calls.some((x) => x.method === "rotate")).toBe(false);
  });

  it("绘制前后成对 save/restore,且以中心为原点平移", () => {
    const c = bitmapToOrientedCanvas(makeBitmap(400, 300), 6);
    const calls = getStubCalls(c);
    expect(calls[0].method).toBe("save");
    expect(calls[calls.length - 1].method).toBe("restore");
    // 平移到画布中心:300/2, 400/2
    expect(calls[1]).toEqual({ method: "translate", args: [150, 200] });
  });
});

// ---------- planStitch ----------

describe("planStitch", () => {
  /** 按 id 建好 bitmaps 映射 */
  function bitmapsOf(items: ImageItem[]) {
    const m = new Map<string, ImageBitmap>();
    for (const it of items) m.set(it.id, makeBitmap(it.width, it.height));
    return m;
  }

  function cfg(over: Partial<StitchConfig> = {}): StitchConfig {
    return { ...DEFAULT_CONFIG, ...over };
  }

  it("垂直拼接:以最大宽为基准等比放大,高度按比例增长", () => {
    const items = [makeItem("a", 200, 100), makeItem("b", 400, 300)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 0 }), bitmapsOf(items));

    // 基准宽 = 400;a 放大 2 倍 → 400×200;b 保持 400×300
    expect(plan.totalWidth).toBe(400);
    expect(plan.totalHeight).toBe(500);
    expect(plan.targets[0]).toMatchObject({ x: 0, y: 0, w: 400, h: 200 });
    expect(plan.targets[1]).toMatchObject({ x: 0, y: 200, w: 400, h: 300 });
  });

  it("垂直拼接:间距只加在图片之间,不加在首尾", () => {
    const items = [makeItem("a", 200, 100), makeItem("b", 400, 300)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 10 }), bitmapsOf(items));

    // 2 张图只有 1 个间隙
    expect(plan.totalHeight).toBe(200 + 300 + 10);
    expect(plan.targets[1].y).toBe(210);
  });

  it("垂直拼接:三张图有两个间隙", () => {
    const items = [makeItem("a", 100, 100), makeItem("b", 100, 100), makeItem("c", 100, 100)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 20 }), bitmapsOf(items));
    expect(plan.totalHeight).toBe(300 + 40);
    expect(plan.targets.map((t) => t.y)).toEqual([0, 120, 240]);
  });

  it("水平拼接:以最大高为基准,宽度按比例增长", () => {
    const items = [makeItem("a", 200, 100), makeItem("b", 400, 300)];
    const plan = planStitch(items, cfg({ direction: "horizontal", gap: 0 }), bitmapsOf(items));

    // 基准高 = 300;a 放大 3 倍 → 600×300;b 保持 400×300
    expect(plan.totalHeight).toBe(300);
    expect(plan.totalWidth).toBe(1000);
    expect(plan.targets[0]).toMatchObject({ x: 0, y: 0, w: 600, h: 300 });
    expect(plan.targets[1]).toMatchObject({ x: 600, y: 0, w: 400, h: 300 });
  });

  it("水平拼接:间距累加到总宽与后续 x 坐标", () => {
    const items = [makeItem("a", 200, 100), makeItem("b", 400, 300)];
    const plan = planStitch(items, cfg({ direction: "horizontal", gap: 10 }), bitmapsOf(items));
    expect(plan.totalWidth).toBe(1010);
    expect(plan.targets[1].x).toBe(610);
  });

  it("单张图:不产生任何间距(gap × 0)", () => {
    const items = [makeItem("only", 300, 200)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 50 }), bitmapsOf(items));
    expect(plan.totalWidth).toBe(300);
    expect(plan.totalHeight).toBe(200);
    expect(plan.targets).toHaveLength(1);
  });

  it("尺寸相同的图不会被缩放", () => {
    const items = [makeItem("a", 300, 200), makeItem("b", 300, 200)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 0 }), bitmapsOf(items));
    expect(plan.targets.every((t) => t.w === 300 && t.h === 200)).toBe(true);
  });

  it("垂直拼接的横向位置恒为 0(不会横向漂移)", () => {
    const items = [makeItem("a", 100, 50), makeItem("b", 800, 200), makeItem("c", 300, 300)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 8 }), bitmapsOf(items));
    expect(plan.targets.every((t) => t.x === 0)).toBe(true);
    expect(plan.targets.every((t) => t.w === 800)).toBe(true);
  });

  it("输出顺序与输入顺序一致(拖拽排序结果不能被打乱)", () => {
    const items = [makeItem("a", 100, 100), makeItem("b", 200, 400), makeItem("c", 300, 150)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 0 }), bitmapsOf(items));
    const ys = plan.targets.map((t) => t.y);
    expect(ys).toEqual([...ys].sort((p, q) => p - q)); // 严格递增
    expect(plan.targets).toHaveLength(3);
  });

  it("每张图都生成了方向修正后的 canvas", () => {
    const items = [makeItem("a", 400, 300, 6)];
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 0 }), bitmapsOf(items));
    // orientation 6 → 位图 400×300 旋转后为 300×400
    expect(plan.targets[0].canvas.width).toBe(300);
    expect(plan.targets[0].canvas.height).toBe(400);
    // 但布局用的是 ImageItem 上已修正的 width/height
    expect(plan.totalWidth).toBe(400);
  });

  it("极端长图会突破 Canvas 上限,由调用方拦截(此处只验证计算结果确实超限)", () => {
    const items = Array.from({ length: 30 }, (_, i) => makeItem(`i${i}`, 1000, 800));
    const plan = planStitch(items, cfg({ direction: "vertical", gap: 0 }), bitmapsOf(items));
    expect(plan.totalHeight).toBe(24000);
    expect(plan.totalHeight).toBeGreaterThan(LIMITS.canvasMaxSide);
  });
});
