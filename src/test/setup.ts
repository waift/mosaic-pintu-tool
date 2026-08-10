/**
 * Vitest 全局前置:为 jsdom 补齐 Canvas 2D 上下文
 *
 * jsdom 未实现 HTMLCanvasElement.prototype.getContext,直接调用会返回 null 并打印
 * "Not implemented" 警告。bitmapToOrientedCanvas 内部拿到 null 后调 ctx.save() 会崩,
 * 导致依赖它的 planStitch 无法测试。
 *
 * 这里打一个"记录调用但不真正绘制"的桩:我们要验证的是布局计算(尺寸/坐标/间距),
 * 不是像素输出,所以无需引入 node-canvas 这类原生依赖。
 */

export interface StubCtxCall {
  method: string;
  args: unknown[];
}

/** 每个 stub context 都会把调用序列记录下来,测试可断言 transform 是否正确 */
export interface StubCtx {
  __calls: StubCtxCall[];
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(...args: unknown[]): void;
  fillRect(...args: unknown[]): void;
  fillStyle: string;
}

function createStubCtx(): StubCtx {
  const calls: StubCtxCall[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };
  return {
    __calls: calls,
    save: record("save"),
    restore: record("restore"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
    drawImage: record("drawImage"),
    fillRect: record("fillRect"),
    fillStyle: "",
  };
}

// 每个 canvas 元素只创建一次 context,重复 getContext 返回同一个(与浏览器行为一致)
const ctxMap = new WeakMap<HTMLCanvasElement, StubCtx>();

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
) {
  if (contextId !== "2d") return null;
  let ctx = ctxMap.get(this);
  if (!ctx) {
    ctx = createStubCtx();
    ctxMap.set(this, ctx);
  }
  return ctx as unknown as CanvasRenderingContext2D;
} as HTMLCanvasElement["getContext"];

/** 测试辅助:取出某个 canvas 上记录的绘制调用 */
export function getStubCalls(canvas: HTMLCanvasElement): StubCtxCall[] {
  return ctxMap.get(canvas)?.__calls ?? [];
}

/**
 * jsdom 未实现 URL.createObjectURL / revokeObjectURL,
 * filterBySize 生成缩略图 URL 时会报错,这里补一个可预测的桩。
 */
let objectUrlSeq = 0;
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => `blob:mock/${++objectUrlSeq}`;
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}
