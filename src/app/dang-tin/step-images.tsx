"use client";

import { useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, ImagePlus, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_LISTING_IMAGES } from "@/lib/listing-images";
import { cn } from "@/lib/utils";
import type { ImageUploads, UploadItem } from "./use-image-uploads";

type Props = {
  uploads: ImageUploads;
  required: boolean;
  error?: string;
};

export function StepImages({ uploads, required, error }: Props) {
  const { items, add, remove, retry, reorder } = uploads;
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const full = items.length >= MAX_LISTING_IMAGES;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // giữ ngón tay 200 ms mới bắt đầu kéo, để vẫn cuộn trang được
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) add(e.target.files);
    e.target.value = ""; // cho phép chọn lại cùng một file
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!full && e.dataTransfer.files.length) add(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">
          Hình ảnh {required ? <span className="text-destructive">*</span> : <span className="font-normal text-muted-foreground">(không bắt buộc)</span>}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {required ? "Cần ít nhất 1 ảnh, " : ""}tối đa {MAX_LISTING_IMAGES} ảnh. Ảnh đầu tiên là ảnh bìa, kéo để sắp xếp lại.
        </p>
      </div>

      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          )}
        >
          <ImagePlus className="size-10 text-muted-foreground" strokeWidth={1.5} />
          <p className="hidden text-sm text-muted-foreground sm:block">Kéo thả ảnh vào đây, hoặc</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" className="h-11" onClick={() => fileInput.current?.click()}>
              <ImagePlus /> Chọn ảnh
            </Button>
            <Button type="button" variant="outline" className="h-11 sm:hidden" onClick={() => cameraInput.current?.click()}>
              <Camera /> Chụp ảnh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Đã chọn {items.length}/{MAX_LISTING_IMAGES} ảnh. Ảnh được nén tự động trước khi tải lên.
          </p>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
        </div>
      )}

      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item, index) => (
                <SortableImage
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={() => remove(item.id)}
                  onRetry={() => retry(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Nút bên trong ô ảnh không được kích hoạt kéo-thả. */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const noDrag = { onMouseDown: stop, onTouchStart: stop, onKeyDown: stop };

type ItemProps = { item: UploadItem; index: number; onRemove: () => void; onRetry: () => void };

function SortableImage({ item, index, onRemove, onRetry }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative aspect-square cursor-grab touch-manipulation overflow-hidden rounded-lg border bg-muted select-none active:cursor-grabbing",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-primary",
      )}
      {...attributes}
      {...listeners}
      aria-label={`Ảnh ${index + 1}${index === 0 ? " (ảnh bìa)" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước chủ yếu là blob: URL cục bộ, next/image không tối ưu được */}
      <img src={item.previewUrl} alt="" className="size-full object-cover" draggable={false} />

      {index === 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          Ảnh bìa
        </span>
      )}

      {(item.status === "compressing" || item.status === "uploading") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 px-2 text-xs text-white">
          <Loader2 className="size-5 animate-spin" />
          {item.status === "compressing" ? "Đang nén..." : `${item.progress}%`}
          {item.status === "uploading" && (
            <div className="h-1 w-full overflow-hidden rounded bg-white/30">
              <div className="h-full bg-white transition-[width]" style={{ width: `${item.progress}%` }} />
            </div>
          )}
        </div>
      )}

      {item.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-2 text-center text-[11px] text-white">
          <span className="line-clamp-2">{item.error}</span>
          <button
            type="button"
            onClick={onRetry}
            {...noDrag}
            className="flex min-h-11 items-center gap-1 rounded bg-white px-3 font-medium text-black"
          >
            <RotateCw className="size-3" /> Thử lại
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        {...noDrag}
        aria-label={`Xóa ảnh ${index + 1}`}
        className="group/remove absolute top-0 right-0 flex size-11 items-start justify-end p-1"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white group-hover/remove:bg-black">
          <X className="size-4" />
        </span>
      </button>
    </li>
  );
}
