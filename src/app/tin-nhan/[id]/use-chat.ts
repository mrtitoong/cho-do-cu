"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMessageEvents } from "@/components/chat/message-events-provider";
import { MESSAGE_COLUMNS, MESSAGE_PAGE_SIZE, newMessageId, type MessageRow } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = MessageRow & { status?: "sending" | "failed" };

/**
 * Gộp tin nhắn theo id (bản mới đè bản cũ). Tin đã lưu xếp theo created_at;
 * tin đang gửi/gửi lỗi luôn nằm cuối theo thứ tự gửi.
 */
function merge(prev: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  const all = [...byId.values()];
  const saved = all
    .filter((m) => !m.status)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return [...saved, ...all.filter((m) => m.status)];
}

type Options = {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  initialHasMore: boolean;
};

export function useChat({ conversationId, currentUserId, initialMessages, initialHasMore }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const upsert = useCallback((incoming: ChatMessage[]) => setMessages((prev) => merge(prev, incoming)), []);

  /** Đánh dấu đã đọc tin của người kia (chỉ khi người dùng đang nhìn trang). */
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    createClient()
      .rpc("mark_conversation_read", { p_conversation_id: conversationId })
      .then(({ error }) => error && console.error("mark_conversation_read:", error));
  }, [conversationId]);

  useEffect(() => {
    markRead();
    const onVisible = () => {
      if (messagesRef.current.some((m) => m.sender_id !== currentUserId && !m.read_at)) markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead, currentUserId]);

  const fetchLatest = useCallback(async () => {
    const { data, error } = await createClient()
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);
    if (error) console.error("messages:", error);
    else upsert(data);
  }, [conversationId, upsert]);

  useMessageEvents((event) => {
    if (event.type === "RESYNC") {
      fetchLatest().then(markRead);
      return;
    }
    if (event.message.conversation_id !== conversationId) return;
    upsert([event.message]);
    if (event.type === "INSERT" && event.message.sender_id !== currentUserId) markRead();
  });

  const deliver = useCallback(
    async (message: ChatMessage) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({ id: message.id, conversation_id: conversationId, body: message.body })
        .select(MESSAGE_COLUMNS)
        .single();
      if (data) return upsert([data]);

      // 23505: tin đã lưu ở lần gửi trước (mất phản hồi) → lấy lại bản đã lưu.
      if (error?.code === "23505") {
        const { data: saved } = await supabase.from("messages").select(MESSAGE_COLUMNS).eq("id", message.id).maybeSingle();
        if (saved) return upsert([saved]);
      }
      console.error("send message:", error);
      upsert([{ ...message, status: "failed" }]);
    },
    [conversationId, upsert],
  );

  const send = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) return;
      const message: ChatMessage = {
        id: newMessageId(),
        conversation_id: conversationId,
        sender_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
        status: "sending",
      };
      upsert([message]);
      void deliver(message);
    },
    [conversationId, currentUserId, deliver, upsert],
  );

  const retry = useCallback(
    (id: string) => {
      const message = messagesRef.current.find((m) => m.id === id);
      if (!message) return;
      const sending = { ...message, status: "sending" as const };
      upsert([sending]);
      void deliver(sending);
    },
    [deliver, upsert],
  );

  const loadingOlderRef = useRef(false);
  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.find((m) => !m.status);
    if (!hasMore || !oldest || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const { data, error } = await createClient()
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
    if (error) {
      console.error("load older messages:", error);
      toast.error("Không tải được tin nhắn cũ, vui lòng thử lại.");
      return;
    }
    upsert(data);
    setHasMore(data.length === MESSAGE_PAGE_SIZE);
  }, [conversationId, hasMore, upsert]);

  return { messages, hasMore, loadingOlder, send, retry, loadOlder };
}
