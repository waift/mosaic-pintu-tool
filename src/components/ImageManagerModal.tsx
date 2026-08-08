import { useEffect, useRef, useState } from "react";
import { X, Check, Trash2, LayoutGrid, Eye } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
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

/** 弹窗内单张缩略图:可拖拽排序、单击选中(view=单选绿框 / multi=多选绿框+徽章)、hover 看大图 */
function ManagerThumb({
  item,
  index,
  selected,
  mode,
  onToggle,
  onView,
}: {
  item: ImageItem;
  index: number;
  selected: boolean;
  mode: Mode;
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

  const style = {
    transform: CSS.Transform.toString(transform),
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
        isDragging && "opacity-50 ring-2 ring-accent-500",
      )}
      title={`${item.file.name} · 单击选中 · 拖拽排序 · hover 看大图`}
    >
      {/* 序号徽章 - 左上角 */}
      <div className="absolute left-1 top-1 z-10 flex h-4 min-w-4 items-center justify-center bg-base-900/80 px-1 font-mono text-[9px] text-ink-100">
        {index + 1}
      </div>

      {/* 删除按钮 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeImage(item.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center",
          "rounded bg-warn-500/90 text-white opacity-0 transition-opacity",
          "hover:bg-warn-600 group-hover:opacity-100",
        )}
        title="删除"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {/* 选中标记 - 仅多选模式且选中时出现 */}
      {mode === "multi" && selected && (
        <div
          className={cn(
            "absolute left-1 bottom-1 z-10 flex h-5 w-5 items-center justify-center rounded border",
            "border-accent-500 bg-accent-500 text-base-900",
          )}
          title="已选中"
        >
          <Check size={12} strokeWidth={3} />
        </div>
      )}

      {/* 查看大图 - hover 右下角浮现 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView(item.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-1 bottom-1 z-20 flex h-9 w-9",
          "items-center justify-center rounded-full bg-base-900/70 text-white",
          "opacity-0 transition-opacity group-hover:opacity-100",
        )}
        title="查看大图"
      >
        <Eye size={18} />
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
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // 整组移动:拖动的图在选中集中且选中多于 1 张(仅多选模式)
    if (mode === "multi" && selected.has(activeId) && selected.size > 1) {
      const group = images.filter((i) => selected.has(i.id));
      const rest = images.filter((i) => !selected.has(i.id));
      // 计算插入点:优先落在非选中图之前;若落点本身在组内,取它在原序列之前的未选中图数量
      let restIndex = rest.findIndex((i) => i.id === overId);
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
    const newIndex = images.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
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
        <div className="flex-1 overflow-y-auto p-4">
          {images.length === 0 ? (
            <div className="flex h-40 items-center justify-center font-mono text-xs text-ink-200">
              暂无图片
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={images.map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-3 justify-items-center gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {images.map((item, idx) => (
                    <ManagerThumb
                      key={item.id}
                      item={item}
                      index={idx}
                      selected={selected.has(item.id)}
                      mode={mode}
                      onToggle={onToggle}
                      onView={setPreviewId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-base-500 px-4 py-2 font-mono text-[10px] text-ink-200">
          {mode === "view"
            ? "查看/单选:单击绿框(无徽章) · 拖动排序 · 点「批量操作」进入多选 · hover 看大图"
            : "多选:勾选徽章+绿框=已选 · 批量选取 · 整组拖 · 反选 · 批量删除 · 退出"}
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
