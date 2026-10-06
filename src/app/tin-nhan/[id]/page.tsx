import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getListing } from "@/app/tin/[id]/data";
import { requireUser } from "@/lib/auth";
import { MESSAGE_COLUMNS, MESSAGE_PAGE_SIZE } from "@/lib/chat";
import { listingImageUrl } from "@/lib/listing-images";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "./chat-view";

export const metadata: Metadata = { title: "Tin nhắn" };

export default async function ConversationPage({ params }: PageProps<"/tin-nhan/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/tin-nhan/${id}`);
  const supabase = await createClient();

  // RLS: chỉ người mua/bán của cuộc trò chuyện đọc được → người khác nhận 404.
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("conversation:", error);
  if (!conversation) notFound();

  const otherId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
  const [listing, { data: other }, { data: messages, error: messagesError }] = await Promise.all([
    getListing(conversation.listing_id),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE),
  ]);
  if (messagesError) console.error("messages:", messagesError);

  const cover = listing?.images[0]?.path;
  return (
    <ChatView
      key={id}
      conversationId={id}
      currentUserId={user.id}
      other={{ name: other?.full_name ?? null, avatarUrl: other?.avatar_url ?? null }}
      listing={
        listing && {
          id: listing.id,
          title: listing.title,
          priceText: listing.priceText,
          status: listing.status,
          coverUrl: cover ? listingImageUrl(cover) : null,
        }
      }
      initialMessages={(messages ?? []).reverse()}
      initialHasMore={(messages?.length ?? 0) === MESSAGE_PAGE_SIZE}
      loadError={Boolean(messagesError)}
    />
  );
}
