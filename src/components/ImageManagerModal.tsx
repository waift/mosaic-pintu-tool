import { useEffect, useState } from "react";
import { X, Check, Trash2, LayoutGrid } from "lucide-react";
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
import type { ImageItem } from "@/types";

/** 弹窗内单张缩略图:可拖拽排序、点击选中(多选)、右上角删除 */
function ManagerThumb({
  item,
  index,
  selected,
  onToggle,
}: {
  item: ImageItem;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
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
        "group relative aspect-square cursor-grab overflow-hidden rounded border bg-base-800",
        "active:cursor-grabbing",
        selected
          ? "border-accent-500 ring-2 ring-accent-500/60"
          : "border-base-500 hover:border-base-400",
        isDragging && "opacity-50",
      )}
      title={`${item.file.name} · 点击选中 · 拖拽排序`}
    >
      {/* 序号徽章 - 左下角 */}
      <div className="absolute bottom-1 left-1 z-10 flex h-4 min-w-4 items-center justify-center bg-base-900/80 px-1 font-mono text-[9px] text-ink-100">
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

      {/* 选中标记 - 左上角 */}
      <div
        className={cn(
          "absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded border transition-all",
          selected
            ? "border-accent-500 bg-accent-500 text-base-900"
            : "border-base-400 bg-base-900/60 text-transparent group-hover:border-ink-200",
        )}
        title="选择"
      >
        <Check size={12} strokeWidth={3} />
      </div>

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

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 关闭时清空选择
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeManager();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      setSelected(new Set());
    };
  }, [closeManager]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // 整组移动:拖动的图在选中集中且选中多于 1 张
    if (selected.has(activeId) && selected.size > 1) {
      const group = images.filter((i) => selected.has(i.id));
      const rest = images.filter((i) => !selected.has(i.id));
      const restIndex = rest.findIndex((i) => i.id === overId);
      if (restIndex < 0) return; // 落在组内,不动
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

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = images.length > 0 && selected.size === images.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(images.map((i) => i.id)));
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    removeImages([...selected]);
    setSelected(new Set());
  };

  return (
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
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {images.map((item, idx) => (
                    <ManagerThumb
                      key={item.id}
                      item={item}
                      index={idx}
                      selected={selected.has(item.id)}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-base-500 px-4 py-2 font-mono text-[10px] text-ink-200">
          点击缩略图选中 · 拖动任意一张排序(选中多张则整组一起移动) · ESC 关闭
        </div>
      </div>
    </div>
  );
}
