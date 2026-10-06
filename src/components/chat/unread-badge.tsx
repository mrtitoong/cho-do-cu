"use client";

import { cn } from "@/lib/utils";
import { useUnreadCount } from "./message-events-provider";

/** Chấm đỏ có số cuộc trò chuyện chưa đọc, đặt trong phần tử cha `relative`. */
export function UnreadBadge({ className }: { className?: string }) {
  const count = useUnreadCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} cuộc trò chuyện chưa đọc`}
      className={cn(
        "absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
