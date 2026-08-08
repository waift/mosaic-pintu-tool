import { useEffect, useRef, useState } from "react";
import { X, Check, Trash2, LayoutGrid, Eye } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStitchStore } from "@/store/stitchStore";
import { cn } from "@/lib/utils";
import ImageModal from "@/components/ImageModal";
import type { ImageItem } from "@/types";

type Mode = "view" | "multi";

// 碰撞检测:优先按指针位置命中(图片间重排),否则回退 closestCenter
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : closestCenter(args);
};

/** 弹窗内单张缩略图:可拖拽排序、单击选中(view=单选绿框 / multi=多选绿框+徽章)、hover 看大图 */
function ManagerThumb({
  item,
  index,
  selected,
  mode,
  activeId,
  inOverlay,
  onToggle,
  onView,
}: {
  item: ImageItem;
  index: number;
  selected: boolean;
  mode: Mode;
  activeId?: string;
  inOverlay: boolean;
  onToggle: (id: string) => void;
  onView: (id: string) => void;
}) {
  const removeImage = useStitchStore((s) => s.removeImage);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // 整组拖动时,参与浮层的图原地保留为清晰占位镜像(虚线框 + 半透明,抑制 transform 不跟随光标);
  // 其余图跟随 dnd-kit 让位动画
  const style = {
    transform: CSS.Transform.toString(inOverlay ? undefined : transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onToggle(item.id)}
      className={cn(
        "group relative h-20 w-20 shrink-0 cursor-grab overflow-hidden rounded border bg-base-700",
        "transition-shadow active:cursor-grabbing",
        selected
          ? "border-accent-500 ring-2 ring-accent-500/60"
          : "border-base-500 hover:border-accent-500 hover:shadow-lift",
        // 单项拖(无浮层)源图跟随光标并半透明;整组拖时组内图原地保留为清晰占位镜像
        !inOverlay && isDragging && "opacity-50 ring-2 ring-accent-500",
        // 整组拖动中:选中图原地留虚线占位框(清晰镜像,含被拖动那张)
        inOverlay && "opacity-40 border-2 border-dashed border-accent-400/70",
      )}
      title={`${item.file.name} · 单击选中 · 拖拽排序 · hover 看大图`}
    >
      {/* 序号徽章 - 左上角 (与列表一致:紧贴角落) */}
      <div className="absolute left-0 top-0 z-10 flex h-4 min-w-4 items-center justify-center bg-base-900/80 px-1 font-mono text-[9px] text-ink-100">
        {index + 1}
      </div>

      {/* 删除按钮 - 右上角 (与列表一致:紧贴角落) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeImage(item.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center",
          "bg-warn-500/90 text-white opacity-0 transition-opacity",
          "hover:bg-warn-600 group-hover:opacity-100",
        )}
        title="删除"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {/* 尺寸标签 - 底部 (与列表一致);多选选中时被选中徽章替代 */}
      {!(mode === "multi" && selected) && (
        <div className="absolute bottom-0 left-0 z-10 bg-base-900/80 px-1 py-px font-mono text-[8px] text-ink-200">
          {item.width}×{item.height}
        </div>
      )}

      {/* 选中标记 - 仅多选模式且选中时出现(左下角,替代尺寸标签) */}
      {mode === "multi" && selected && (
        <div
          className={cn(
            "absolute left-0 bottom-0 z-10 flex h-5 w-5 items-center justify-center rounded border",
            "border-accent-500 bg-accent-500 text-base-900",
          )}
          title="已选中"
        >
          <Check size={12} strokeWidth={3} />
        </div>
      )}

      {/* 查看大图 - hover 右下角浮现 (与删除按钮同尺寸: h-5 w-5 小方块) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView(item.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-0 bottom-0 z-20 flex h-5 w-5",
          "items-center justify-center rounded bg-base-900/70 text-white",
          "opacity-0 transition-opacity group-hover:opacity-100",
        )}
        title="查看大图"
      >
        <Eye size={12} />
      </button>

      {/* 缩略图 */}
      <img
        src={item.thumbUrl}
        alt={item.file.name}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

export default function ImageManagerModal() {
  const images = useStitchStore((s) => s.images);
  const setImages = useStitchStore((s) => s.setImages);
  const removeImages = useStitchStore((s) => s.removeImages);
  const clearImages = useStitchStore((s) => s.clearImages);
  const closeManager = useStitchStore((s) => s.closeManager);

  const [mode, setMode] = useState<Mode>("view");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // 拖动中的项ID(用于 DragOverlay)

  // 末尾投放区 DOM 引用:用于判断拖拽结束时的指针是否落在"放到末尾"区域
  const endZoneRef = useRef<HTMLDivElement>(null);

  // 用 ref 跟踪 previewId,供 ESC 监听读取最新值(避免 effect 依赖 previewId 导致预览状态被重置)
  const previewIdRef = useRef<string | null>(null);
  useEffect(() => {
    previewIdRef.current = previewId;
  }, [previewId]);

  // 关闭/卸载时清理选择、预览与滚动锁;依赖稳定,不随 previewId 变化触发重置
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewIdRef.current) setPreviewId(null);
      else closeManager();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      setSelected(new Set());
      setPreviewId(null);
    };
  }, [closeManager, setPreviewId]);

  // 大图预览:根据 previewId 由原始 File 生成全分辨率 ObjectURL,关闭时释放
  useEffect(() => {
    if (!previewId) {
      setPreviewUrl(null);
      return;
    }
    const it = images.find((i) => i.id === previewId);
    if (!it) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(it.file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [previewId, images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // 末尾投放判定:拖拽结束时指针 Y 落在"放到末尾"区域(末尾投放区顶部)之上 → 放到队列最后。
    // 用指针最终坐标(dnd-kit 不保证哨兵 droppable 可靠命中,故直接读 DOM 矩形判断,稳定可靠)
    let overIsEnd = false;
    const endEl = endZoneRef.current;
    if (endEl) {
      const r = endEl.getBoundingClientRect();
      const pe = e.activatorEvent as PointerEvent;
      if (typeof pe?.clientY === "number") {
        const pointerY = pe.clientY + e.delta.y;
        overIsEnd = pointerY >= r.top - 6;
      }
    }

    // 整组移动:拖动的图在选中集中且选中多于 1 张(仅多选模式)
    if (mode === "multi" && selected.has(activeId) && selected.size > 1) {
      const group = images.filter((i) => selected.has(i.id));
      const rest = images.filter((i) => !selected.has(i.id));
      // 计算插入点:优先落在非选中图之前;若落点本身在组内,取它在原序列之前的未选中图数量
      let restIndex = overIsEnd
        ? rest.length // 拖到末尾投放区:插到队列最后
        : rest.findIndex((i) => i.id === overId);
      if (restIndex < 0) {
        const overIdx = images.findIndex((i) => i.id === overId);
        if (overIdx < 0) return;
        restIndex = images
          .slice(0, overIdx)
          .filter((i) => !selected.has(i.id)).length;
      }
      setImages([
        ...rest.slice(0, restIndex),
        ...group,
        ...rest.slice(restIndex),
      ]);
      return;
    }

    // 单张移动
    const oldIndex = images.findIndex((i) => i.id === activeId);
    if (oldIndex < 0) return;
    const newIndex = overIsEnd
      ? images.length - 1
      : images.findIndex((i) => i.id === overId);
    if (newIndex < 0) return;
    setImages(arrayMove(images, oldIndex, newIndex));
  };

  // 单击缩略图
  const onToggle = (id: string) => {
    setSelected((prev) => {
      if (mode === "view") {
        // 单选:再次点同一个则取消,否则只选它
        const next = new Set<string>();
        if (!(prev.has(id) && prev.size === 1)) next.add(id);
        return next;
      }
      // 多选:切换
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterMulti = () => {
    setMode("multi");
    setSelected(new Set());
  };
  const exitMulti = () => {
    setMode("view");
    setSelected(new Set());
  };

  const allSelected = images.length > 0 && selected.size === images.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(images.map((i) => i.id)));
  };
  const invert = () => {
    setSelected(new Set(images.filter((i) => !selected.has(i.id)).map((i) => i.id)));
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    removeImages([...selected]);
    setSelected(new Set());
  };

  // 大图预览
  const previewIndex = previewId ? images.findIndex((i) => i.id === previewId) : -1;

  return (
    <>
      <div
        onClick={closeManager}
        className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/80 p-4 backdrop-blur-sm animate-fade-in md:p-8"
      >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-base-500 bg-base-700 shadow-lift"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-base-500 px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-accent-400" />
            <h2 className="font-display text-sm font-semibold text-ink-50">
              图片管理
            </h2>
            <span className="font-mono text-[11px] text-ink-200">
              共 {images.length} 张
            </span>
            {mode === "multi" && (
              <span className="rounded bg-accent-500/20 px-1.5 py-0.5 font-mono text-[10px] text-accent-300">
                多选模式
              </span>
            )}
          </div>
          <button
            onClick={closeManager}
            className="flex h-8 w-8 items-center justify-center rounded text-ink-200 transition-colors hover:bg-base-600 hover:text-ink-50"
            title="关闭 (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-base-500 px-4 py-2">
          {mode === "view" ? (
            <>
              <button
                onClick={toggleAll}
                className="rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-100 transition-colors hover:bg-base-600"
              >
                {allSelected ? "取消全选" : "全选"}
              </button>
              <span className="font-mono text-[11px] text-ink-200">
                已选 {selected.size} 张
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={enterMulti}
                  className="rounded bg-accent-500/90 px-2.5 py-1.5 font-mono text-[11px] text-base-900 transition-colors hover:bg-accent-600"
                  title="进入多选模式,批量操作"
                >
                  批量操作
                </button>
                <button
                  onClick={clearImages}
                  disabled={images.length === 0}
                  className={cn(
                    "rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-100 transition-colors",
                    "hover:bg-base-600 disabled:cursor-not-allowed disabled:opacity-30",
                  )}
                  title="清空所有图片(保留配置)"
                >
                  清空全部
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={exitMulti}
                className="rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-100 transition-colors hover:bg-base-600"
                title="退出多选模式"
              >
                退出批量
              </button>
              <button
                onClick={toggleAll}
                className="rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-100 transition-colors hover:bg-base-600"
              >
                {allSelected ? "取消全选" : "全选"}
              </button>
              <button
                onClick={invert}
                className="rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-100 transition-colors hover:bg-base-600"
                title="反选"
              >
                反选
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={deleteSelected}
                  disabled={selected.size === 0}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                    selected.size > 0
                      ? "bg-warn-500/90 text-white hover:bg-warn-600"
                      : "cursor-not-allowed bg-base-700 text-ink-200 opacity-40",
                  )}
                  title="删除选中的图片"
                >
                  <Trash2 size={12} />
                  删除选中 ({selected.size})
                </button>
                <span className="font-mono text-[11px] text-ink-200">
                  已选 {selected.size} 张
                </span>
              </div>
            </>
          )}
        </div>

        {/* 网格主体 */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {images.length === 0 ? (
            <div className="flex h-40 items-center justify-center font-mono text-xs text-ink-200">
              暂无图片
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <SortableContext
                  items={images.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2 content-start">
                    {images.map((item, idx) => {
                      const sel = selected.has(item.id);
                      return (
                        <ManagerThumb
                          key={item.id}
                          item={item}
                          index={idx}
                          selected={sel}
                          mode={mode}
                          activeId={activeId ?? undefined}
                          inOverlay={
                            mode === "multi" && !!activeId && selected.size > 1 && sel
                          }
                          onToggle={onToggle}
                          onView={setPreviewId}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
                {/* 末尾投放区:拖到此处(队列下方的虚线区)即把整组/单张放到队列最后 */}
                <div
                  ref={endZoneRef}
                  className={cn(
                    "mt-2 flex min-h-[48px] flex-1 items-center justify-center rounded border border-dashed",
                    "border-base-500/50 font-mono text-[10px] text-ink-300",
                    "transition-colors",
                  )}
                >
                  拖到此处 → 放到末尾
                </div>
              </div>

              {/* 拖拽浮层:仅多选整组拖动时显示堆叠卡片,单项拖动用 dnd-kit 默认行为(无额外副本) */}
              <DragOverlay
                dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.1, 0.99)",
                }}
              >
                {activeId && mode === "multi" && selected.has(activeId) && selected.size > 1 ? (
                  // 整组堆叠:像一摞扑克牌,每张错开
                  <div className="relative h-20 w-20">
                      {Array.from(selected).map((id, i) => {
                        const it = images.find((img) => img.id === id);
                        if (!it) return null;
                        const isMain = id === activeId;
                        return (
                          <div
                            key={id}
                            className={cn(
                              "absolute h-20 w-20 overflow-hidden rounded border bg-base-700 shadow-xl",
                              isMain
                                ? "border-accent-500 ring-2 ring-accent-500/60 z-10"
                                : "border-base-400",
                            )}
                            style={{
                              transform: `translate(${i * 4}px, ${i * 4}px)`,
                              zIndex: i + (isMain ? 10 : 0),
                            }}
                          >
                            <img
                              src={it.thumbUrl}
                              alt={it.file.name}
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-base-500 px-4 py-2 font-mono text-[10px] text-ink-200">
          {mode === "view"
            ? "查看/单选:单击绿框(无徽章) · 拖动排序 · 点「批量操作」进入多选 · hover 看大图"
            : "多选:勾选徽章+绿框=已选 · 批量选取 · 整组拖 · 拖到下方虚线区=放到末尾 · 反选 · 批量删除 · 退出"}
        </div>
      </div>
      </div>

      {/* 大图预览 lightbox */}
      {previewId && previewIndex >= 0 && previewUrl && (
        <ImageModal
          src={previewUrl}
          name={images[previewIndex].file.name}
          index={previewIndex + 1}
          total={images.length}
          onPrev={() =>
            setPreviewId(
              images[(previewIndex - 1 + images.length) % images.length].id,
            )
          }
          onNext={() =>
            setPreviewId(images[(previewIndex + 1) % images.length].id)
          }
          onClose={() => setPreviewId(null)}
        />
      )}
    </>
  );
}
