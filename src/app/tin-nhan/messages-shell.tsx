"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Máy tính: hộp thư bên trái, khung chat bên phải.
 * Điện thoại: /tin-nhan chỉ hiện hộp thư; /tin-nhan/[id] chỉ hiện khung chat (cao vừa màn hình,
 * trừ thanh trên cùng và thanh điều hướng dưới đáy).
 */
export function MessagesShell({ inbox, children }: { inbox: React.ReactNode; children: React.ReactNode }) {
  const conversationOpen = useSelectedLayoutSegment() !== null;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl md:h-[calc(100dvh-4rem)] md:border-x",
        conversationOpen ? "h-[calc(100dvh-8rem-env(safe-area-inset-bottom))]" : "flex-1",
      )}
    >
      <aside
        className={cn(
          "w-full min-w-0 flex-col md:flex md:w-80 md:border-r lg:w-96",
          conversationOpen ? "hidden" : "flex",
        )}
      >
        {inbox}
      </aside>
      <section className={cn("min-w-0 flex-1 flex-col", conversationOpen ? "flex" : "hidden md:flex")}>
        {children}
      </section>
    </div>
  );
}
