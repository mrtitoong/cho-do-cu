"use client";

import Link from "next/link";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { ListingImage } from "@/components/listing-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { displayName, LISTING_STATUS_LABELS, type MessageRow } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { useChat } from "./use-chat";

export type ChatListing = {
  id: string;
  title: string;
  priceText: string;
  status: string;
  coverPath: string | null;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  other: { name: string | null; avatarUrl: string | null };
  /** null: tin đã bị ẩn/xóa, người xem không còn quyền xem */
  listing: ChatListing | null;
  initialMessages: MessageRow[];
  initialHasMore: boolean;
  loadError: boolean;
};

export function ChatView({ conversationId, currentUserId, other, listing, initialMessages, initialHasMore, loadError }: Props) {
  const chat = useChat({ conversationId, currentUserId, initialMessages, initialHasMore });
  const name = displayName(other.name);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b px-2 py-2 md:px-4">
        <Button asChild variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Quay lại hộp thư">
          <Link href="/tin-nhan">
            <ArrowLeft />
          </Link>
        </Button>
        <Avatar size="lg">
          {other.avatarUrl && <AvatarImage src={other.avatarUrl} alt="" />}
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
      </header>

      <ListingCard listing={listing} />

      {loadError && (
        <p className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Không tải được tin nhắn cũ. Hãy tải lại trang.
        </p>
      )}

      <MessageList
        messages={chat.messages}
        currentUserId={currentUserId}
        otherName={name}
        hasMore={chat.hasMore}
        loadingOlder={chat.loadingOlder}
        onLoadOlder={chat.loadOlder}
        onRetry={chat.retry}
        onQuickReply={chat.send}
      />

      <Composer onSend={chat.send} />
    </div>
  );
}

function ListingCard({ listing }: { listing: ChatListing | null }) {
  if (!listing) {
    return <p className="border-b px-4 py-3 text-sm text-muted-foreground">Tin đăng này không còn hiển thị.</p>;
  }
  return (
    <Link href={`/tin/${listing.id}`} className="flex items-center gap-3 border-b px-4 py-2 hover:bg-muted/60">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {listing.coverPath ? (
          <ListingImage path={listing.coverPath} sizes="48px" className="size-full" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{listing.title}</p>
        <p className="text-sm font-semibold text-primary">{listing.priceText}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          listing.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
        )}
      >
        {LISTING_STATUS_LABELS[listing.status] ?? listing.status}
      </span>
    </Link>
  );
}
