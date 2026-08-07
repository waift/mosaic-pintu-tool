import { useState } from "react";
import { X } from "lucide-react";
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
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStitchStore } from "@/store/stitchStore";
import { cn } from "@/lib/utils";
import type { ImageItem } from "@/types";
import ImageModal from "@/components/ImageModal";

/** 单张缩略图卡片:整卡可拖拽,点击放大查看原图 */
function ThumbCard({
  item,
  index,
  onPreview,
}: {
  item: ImageItem;
  index: number;
  onPreview: (item: ImageItem) => void;
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
      onClick={() => onPreview(item)}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative shrink-0 cursor-grab overflow-hidden rounded border border-base-500 bg-base-700",
        "h-20 w-20 transition-shadow hover:shadow-lift",
        "active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-accent-500",
      )}
      title={`${item.file.name} · 点击查看原图 · 拖拽排序`}
    >
      {/* 序号徽章 - 左上角 */}
      <div className="absolute left-0 top-0 z-10 flex h-4 min-w-4 items-center justify-center bg-base-900/80 px-1 font-mono text-[9px] text-ink-100">
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
          "absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center",
          "bg-warn-500/90 text-white opacity-0 transition-opacity",
          "hover:bg-warn-600 group-hover:opacity-100",
        )}
        title="删除"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {/* 缩略图 */}
      <img
        src={item.thumbUrl}
        alt={item.file.name}
        className="h-full w-full object-cover"
        draggable={false}
      />

      {/* 尺寸标签 - 底部 */}
      <div className="absolute bottom-0 left-0 z-10 bg-base-900/80 px-1 py-px font-mono text-[8px] text-ink-200">
        {item.width}×{item.height}
      </div>
    </div>
  );
}

export default function ImageList() {
  const images = useStitchStore((s) => s.images);
  const setImages = useStitchStore((s) => s.setImages);
  const [previewItem, setPreviewItem] = useState<ImageItem | null>(null);

  const sensors = useSensors(
    // distance: 5px 内视为点击(放大原图),超过则进入拖拽
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setImages(arrayMove(images, oldIndex, newIndex));
  };

  if (images.length === 0) return null;

  return (
    <>
      <div className="rounded border border-base-500 bg-base-700/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-xs font-medium text-ink-100">
            图片列表
          </span>
          <span className="font-mono text-[10px] text-ink-200">
            {images.length} 张 · 点击查看原图 · 拖拽排序
          </span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={images.map((i) => i.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((item, idx) => (
                <ThumbCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {previewItem && (
        <ImageModal
          src={previewItem.thumbUrl}
          name={previewItem.file.name}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}
