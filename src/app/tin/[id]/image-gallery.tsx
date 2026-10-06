"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ListingImage } from "@/components/listing-image";
import { cn } from "@/lib/utils";

type Props = { title: string; paths: string[] };

/**
 * Dãy ảnh cuộn ngang có snap: vuốt được trên điện thoại, nút trái/phải trên máy tính.
 * Trả về ref + chỉ số ảnh đang xem + hàm cuộn tới ảnh i.
 */
function useSlider(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }
  function goTo(i: number, smooth = true) {
    const el = ref.current;
    const next = Math.max(0, Math.min(count - 1, i));
    el?.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
    setIndex(next);
  }
  return { ref, index, onScroll, goTo };
}

function Slides({
  title,
  paths,
  slider,
  onOpen,
  fullscreen,
}: Props & { slider: ReturnType<typeof useSlider>; onOpen?: () => void; fullscreen?: boolean }) {
  const { ref, index, onScroll, goTo } = slider;
  const navButton = "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 md:flex";

  return (
    <div className="relative size-full">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {paths.map((path, i) => (
          <button
            key={path}
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className="size-full shrink-0 snap-center"
            aria-label={onOpen ? `Xem ảnh ${i + 1} toàn màn hình` : undefined}
          >
            <ListingImage
              path={path}
              alt={`${title} - ảnh ${i + 1}`}
              sizes={fullscreen ? "100vw" : "(min-width: 1024px) 640px, (min-width: 768px) 60vw, 100vw"}
              preload={i === 0 && !fullscreen}
              className={cn("size-full", fullscreen && "bg-transparent")}
              imgClassName={fullscreen ? "object-contain" : "object-cover"}
            />
          </button>
        ))}
      </div>
      {paths.length > 1 && (
        <>
          {index > 0 && (
            <button type="button" onClick={() => goTo(index - 1)} className={cn(navButton, "left-3")} aria-label="Ảnh trước">
              <ChevronLeft />
            </button>
          )}
          {index < paths.length - 1 && (
            <button type="button" onClick={() => goTo(index + 1)} className={cn(navButton, "right-3")} aria-label="Ảnh sau">
              <ChevronRight />
            </button>
          )}
          <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1}/{paths.length}
          </span>
        </>
      )}
      {onOpen && (
        <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white md:flex">
          <Expand className="size-3.5" /> Bấm để phóng to
        </span>
      )}
    </div>
  );
}

/** Thư viện ảnh: ảnh lớn + dãy ảnh nhỏ, vuốt trên điện thoại, bấm để xem toàn màn hình. */
export function ImageGallery({ title, paths }: Props) {
  const main = useSlider(paths.length);
  const full = useSlider(paths.length);
  const [open, setOpen] = useState(false);

  // Mở toàn màn hình đúng ảnh đang xem; đóng lại thì ảnh lớn theo ảnh vừa xem
  useEffect(() => {
    if (open) requestAnimationFrame(() => full.goTo(main.index, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở/đóng
  }, [open]);

  function onOpenChange(next: boolean) {
    if (!next) main.goTo(full.index, false);
    setOpen(next);
  }

  if (paths.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="aspect-[4/3] overflow-hidden bg-muted md:rounded-xl">
        <Slides title={title} paths={paths} slider={main} onOpen={() => setOpen(true)} />
      </div>

      {paths.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 md:px-0">
          {paths.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => main.goTo(i)}
              aria-label={`Ảnh ${i + 1}`}
              aria-current={i === main.index}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
                i === main.index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ListingImage path={path} sizes="64px" className="size-full" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="block h-dvh w-screen max-w-none rounded-none bg-black p-0 ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <Slides title={title} paths={paths} slider={full} fullscreen />
          <DialogClose
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex size-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Đóng"
          >
            <X />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
