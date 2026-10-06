"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { dayKey, formatDayLabel, formatMessageTime, QUICK_REPLIES } from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./use-chat";

type Props = {
  messages: ChatMessage[];
  currentUserId: string;
  otherName: string;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetry: (id: string) => void;
  onQuickReply: (text: string) => void;
};

/** Cách đáy dưới mức này coi như đang xem tin mới nhất → có tin mới thì tự cuộn xuống. */
const NEAR_BOTTOM_PX = 120;
/** Cuộn gần đỉnh mức này thì tải thêm tin cũ. */
const LOAD_OLDER_PX = 100;

export function MessageList({ messages, currentUserId, otherName, hasMore, loadingOlder, onLoadOlder, onRetry, onQuickReply }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const snapshot = useRef({ first: undefined as string | undefined, last: undefined as string | undefined, height: 0 });

  // Giữ vị trí cuộn: lần đầu ở đáy; tin mới → xuống đáy (nếu đang ở đáy hoặc tự mình gửi);
  // tải thêm tin cũ ở đầu → giữ nguyên đoạn đang xem.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = messages[0]?.id;
    const lastMessage = messages.at(-1);
    const prev = snapshot.current;
    if (prev.height === 0) {
      el.scrollTop = el.scrollHeight;
    } else if (lastMessage?.id !== prev.last) {
      if (nearBottom.current || lastMessage?.sender_id === currentUserId) el.scrollTop = el.scrollHeight;
    } else if (first !== prev.first) {
      el.scrollTop += el.scrollHeight - prev.height;
    }
    snapshot.current = { first, last: lastMessage?.id, height: el.scrollHeight };
  }, [messages, currentUserId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (el.scrollTop < LOAD_OLDER_PX && hasMore && !loadingOlder) onLoadOlder();
  }

  let lastMineIndex = -1;
  messages.forEach((m, i) => {
    if (m.sender_id === currentUserId) lastMineIndex = i;
  });

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-4">
      {loadingOlder && (
        <div className="flex justify-center pb-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-label="Đang tải tin nhắn cũ" />
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Bắt đầu trò chuyện với {otherName}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_REPLIES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => onQuickReply(text)}
                className="min-h-11 rounded-full border bg-background px-4 py-2 text-sm hover:bg-muted"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="space-y-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === currentUserId;
            const newDay = i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at);
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <li className="py-3 text-center text-xs text-muted-foreground" suppressHydrationWarning>
                    {formatDayLabel(m.created_at)}
                  </li>
                )}
                <li className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-[15px] break-words whitespace-pre-wrap md:max-w-[70%]",
                      mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                      m.status === "sending" && "opacity-70",
                    )}
                  >
                    {m.body}
                    <time
                      dateTime={m.created_at}
                      suppressHydrationWarning
                      className={cn("ml-2 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}
                    >
                      {formatMessageTime(m.created_at)}
                    </time>
                  </div>
                  {m.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => onRetry(m.id)}
                      className="mt-0.5 flex min-h-11 items-center gap-1 text-xs text-destructive"
                    >
                      <AlertCircle className="size-3.5" /> Không gửi được ·
                      <span className="inline-flex items-center gap-1 font-medium underline">
                        <RotateCw className="size-3.5" /> Gửi lại
                      </span>
                    </button>
                  ) : (
                    i === lastMineIndex && (
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {m.status === "sending" ? "Đang gửi..." : m.read_at ? "Đã xem" : "Đã gửi"}
                      </span>
                    )
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}
    </div>
  );
}
