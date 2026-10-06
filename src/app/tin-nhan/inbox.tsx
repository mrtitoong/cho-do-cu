"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageIcon, Loader2, MessageCircle } from "lucide-react";
import { useMessageEvents } from "@/components/chat/message-events-provider";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayName, formatInboxTime, type InboxItem } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Filter = "all" | "buying" | "selling";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "buying", label: "Đang mua" },
  { value: "selling", label: "Đang bán" },
];

type Props = { userId: string; initialItems: InboxItem[]; initialError: boolean };

/** Hộp thư: danh sách cuộc trò chuyện, tự cập nhật khi có tin nhắn mới hoặc vừa đọc. */
export function Inbox({ userId, initialItems, initialError }: Props) {
  const pathname = usePathname();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState(initialError);
  const [reloading, setReloading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reload = useCallback(async () => {
    const { data, error } = await createClient().rpc("get_inbox");
    if (error) {
      console.error("get_inbox:", error);
      return false;
    }
    setItems(data ?? []);
    setError(false);
    return true;
  }, []);

  // Gom nhiều sự kiện liên tiếp thành một lần tải lại.
  useMessageEvents(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(reload, 400);
  });
  useEffect(() => () => clearTimeout(reloadTimer.current), []);

  async function retry() {
    setReloading(true);
    await reload();
    setReloading(false);
  }

  const visible = filter === "all" ? items : items.filter((i) => i.role === filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b p-4">
        <h1 className="text-xl font-bold tracking-tight">Tin nhắn</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-11 w-full">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <p>Không tải được hộp thư.</p>
            <Button variant="outline" className="h-11" onClick={retry} disabled={reloading}>
              {reloading && <Loader2 className="animate-spin" />} Thử lại
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyInbox hasAny={items.length > 0} />
        ) : (
          <ul className="divide-y">
            {visible.map((item) => (
              <li key={item.id}>
                <InboxRow item={item} userId={userId} active={pathname === `/tin-nhan/${item.id}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InboxRow({ item, userId, active }: { item: InboxItem; userId: string; active: boolean }) {
  const unread = item.unread_count > 0;
  const preview = item.last_body
    ? `${item.last_sender_id === userId ? "Bạn: " : ""}${item.last_body}`
    : "Chưa có tin nhắn";

  return (
    <Link
      href={`/tin-nhan/${item.id}`}
      aria-current={active ? "page" : undefined}
      className={cn("flex gap-3 px-4 py-3 hover:bg-muted/60", active && "bg-muted")}
    >
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {item.listing_cover_path ? (
          <ListingImage path={item.listing_cover_path} sizes="56px" className="size-full" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("min-w-0 flex-1 truncate", unread ? "font-semibold" : "font-medium")}>
            {displayName(item.other_name)}
          </p>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.last_at} suppressHydrationWarning>
            {formatInboxTime(item.last_at)}
          </time>
        </div>
        <p className="truncate text-xs text-muted-foreground">{item.listing_title ?? "Tin không còn hiển thị"}</p>
        <div className="flex items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {preview}
          </p>
          {unread && <span className="size-2.5 shrink-0 rounded-full bg-red-600" aria-label="Chưa đọc" />}
        </div>
      </div>
    </Link>
  );
}

function EmptyInbox({ hasAny }: { hasAny: boolean }) {
  if (hasAny) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Không có cuộc trò chuyện nào ở mục này.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
      <MessageCircle className="size-10" />
      <p>Chưa có cuộc trò chuyện nào. Bấm &quot;Chat với người bán&quot; ở một tin đăng để bắt đầu.</p>
      <Button asChild variant="outline" className="h-11">
        <Link href="/">Xem tin đăng</Link>
      </Button>
    </div>
  );
}
