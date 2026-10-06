"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { newMessageId, type MessageRow } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

/**
 * INSERT/UPDATE: tin nhắn mới hoặc vừa được đánh dấu đã đọc.
 * RESYNC: kênh realtime vừa kết nối lại, có thể đã lỡ sự kiện → nên tải lại dữ liệu.
 */
export type MessageEvent = { type: "INSERT" | "UPDATE"; message: MessageRow } | { type: "RESYNC" };
type Listener = (event: MessageEvent) => void;

type ContextValue = {
  unreadCount: number;
  subscribe: (listener: Listener) => () => void;
};

const MessageEventsContext = createContext<ContextValue | null>(null);

/**
 * Một kênh Realtime duy nhất cho cả app: nghe INSERT/UPDATE trên bảng messages.
 * RLS của Realtime chỉ gửi tin nhắn thuộc cuộc trò chuyện của người đang đăng nhập.
 * Đồng thời giữ số cuộc trò chuyện chưa đọc cho badge "Tin nhắn".
 */
export function MessageEventsProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refreshUnread = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      const { data, error } = await createClient().rpc("get_unread_conversation_count");
      if (error) console.error("get_unread_conversation_count:", error);
      else setUnreadCount(data ?? 0);
    }, 300);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const emit = (event: MessageEvent) => listeners.current.forEach((fn) => fn(event));
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let subscribedOnce = false;

    refreshUnread();
    (async () => {
      // Gắn JWT của phiên hiện tại để Realtime áp RLS đúng người.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`messages:${userId}:${newMessageId()}`)
        .on<MessageRow>("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          emit({ type: "INSERT", message: payload.new });
          refreshUnread();
        })
        .on<MessageRow>("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
          emit({ type: "UPDATE", message: payload.new });
          refreshUnread();
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (subscribedOnce) {
            emit({ type: "RESYNC" });
            refreshUnread();
          }
          subscribedOnce = true;
        });
    })();

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, refreshUnread]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ unreadCount: userId ? unreadCount : 0, subscribe }), [userId, unreadCount, subscribe]);
  return <MessageEventsContext.Provider value={value}>{children}</MessageEventsContext.Provider>;
}

/** Số cuộc trò chuyện có tin chưa đọc. */
export function useUnreadCount() {
  return useContext(MessageEventsContext)?.unreadCount ?? 0;
}

/** Nhận sự kiện tin nhắn realtime; tự hủy đăng ký khi component unmount. */
export function useMessageEvents(listener: Listener) {
  const subscribe = useContext(MessageEventsContext)?.subscribe;
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => subscribe?.((event) => listenerRef.current(event)), [subscribe]);
}
