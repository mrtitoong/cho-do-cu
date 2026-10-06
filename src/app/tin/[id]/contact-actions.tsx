"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader2, MessageCircle, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginUrl } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { setListingStatus } from "@/app/tin-cua-toi/actions";
import { startConversation } from "./actions";

type Props = {
  listingId: string;
  status: string;
  isOwner: boolean;
  loggedIn: boolean;
  /** "0912 xxx xxx"; null = người bán chưa khai số; undefined = không rõ */
  phoneHint: string | null | undefined;
};

/** "0912345678" → "0912 345 678" */
const formatPhone = (phone: string) => phone.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");

/**
 * Nút hành động của trang chi tiết. layout "sidebar": cột phải trên máy tính;
 * "bottom-bar": thanh cố định dưới đáy trên điện thoại (ngay trên thanh điều hướng).
 */
export function ContactActions({ layout, ...props }: Props & { layout: "sidebar" | "bottom-bar" }) {
  const { status, isOwner } = props;
  if (!isOwner && status !== "active") return null;

  const row = layout === "bottom-bar";
  const buttons = isOwner ? <OwnerButtons {...props} row={row} /> : <BuyerButtons {...props} row={row} />;
  if (!row) return buttons;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur md:hidden">
      {buttons}
    </div>
  );
}

function BuyerButtons({ listingId, loggedIn, phoneHint, row }: Props & { row?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [noPhone, setNoPhone] = useState(phoneHint === null);
  const [revealing, setRevealing] = useState(false);
  const [chatting, startChat] = useTransition();

  async function reveal() {
    if (!loggedIn) {
      router.push(loginUrl(`/tin/${listingId}`));
      return;
    }
    setRevealing(true);
    const { data, error } = await createClient().rpc("get_seller_phone", { p_listing_id: listingId });
    setRevealing(false);
    if (error) {
      const limited = error.hint === "phone_reveal_limit";
      toast.error(limited ? error.message : "Không lấy được số điện thoại, vui lòng thử lại.");
      if (!limited) console.error("get_seller_phone:", error);
      return;
    }
    if (data) setPhone(data);
    else setNoPhone(true);
  }

  async function copy() {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Đã sao chép số điện thoại");
    } catch {
      toast.error("Không sao chép được, hãy chép thủ công.");
    }
  }

  function chat() {
    startChat(async () => {
      const result = await startConversation(listingId);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  const chatButton = (
    <Button onClick={chat} disabled={chatting} variant={row ? "outline" : "default"} className="h-11 flex-1 text-base">
      {chatting ? <Loader2 className="animate-spin" /> : <MessageCircle />} {row ? "Chat" : "Chat với người bán"}
    </Button>
  );

  let contact: React.ReactNode;
  if (noPhone) {
    contact = (
      <p className="flex h-11 flex-1 items-center justify-center rounded-md bg-muted px-3 text-center text-sm text-muted-foreground">
        Người bán chỉ nhận chat
      </p>
    );
  } else if (phone) {
    contact = (
      <div className="flex flex-1 gap-2">
        <Button asChild className="h-11 flex-1 bg-green-600 text-base hover:bg-green-700">
          <a href={`tel:${phone}`}>
            <Phone /> Gọi {formatPhone(phone)}
          </a>
        </Button>
        <Button onClick={copy} variant="outline" className="h-11 shrink-0" aria-label="Sao chép số điện thoại">
          <Copy /> {!row && "Sao chép"}
        </Button>
      </div>
    );
  } else {
    contact = (
      <Button
        onClick={reveal}
        disabled={revealing}
        className="h-11 flex-1 bg-green-600 text-base hover:bg-green-700"
      >
        {revealing ? <Loader2 className="animate-spin" /> : <Phone />}
        <span className="flex flex-col items-start leading-tight">
          <span>Liên hệ</span>
          <span className="text-xs font-normal opacity-90">{phoneHint ?? "09xx xxx xxx"}</span>
        </span>
      </Button>
    );
  }

  return (
    <div className={cn("flex gap-2", row ? "flex-row" : "flex-col")}>
      {contact}
      {chatButton}
    </div>
  );
}

function OwnerButtons({ listingId, status, row }: Props & { row?: boolean }) {
  const [pending, startTransition] = useTransition();

  function markSold() {
    startTransition(async () => {
      const result = await setListingStatus(listingId, "sold");
      if (result.ok) toast.success("Đã đánh dấu tin là đã bán");
      else toast.error(result.error);
    });
  }

  return (
    <div className={cn("flex gap-2", row ? "flex-row" : "flex-col")}>
      <Button asChild variant="outline" className="h-11 flex-1 text-base">
        <Link href={`/tin/${listingId}/sua`}>
          <Pencil /> Sửa tin
        </Link>
      </Button>
      {status === "active" && (
        <Button onClick={markSold} disabled={pending} className="h-11 flex-1 text-base">
          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Đánh dấu đã bán
        </Button>
      )}
    </div>
  );
}
