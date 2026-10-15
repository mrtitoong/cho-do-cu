"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";
import { getBuyerCandidates, markListingSold, type BuyerCandidate } from "@/app/tin-cua-toi/actions";
import { NumberInput } from "@/components/number-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatNumber, formatPriceShort, parseDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  /** Giá đăng, làm giá chốt mặc định (null = Thỏa thuận) */
  price: number | null;
  /** Nội dung nút mở hộp thoại */
  children: ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
};

const OUTSIDE = "outside";

type Buyers = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; list: BuyerCandidate[] };

/** Nút "Đánh dấu đã bán": hộp thoại chọn người mua (trong số người đã chat) và nhập giá chốt. */
export function MarkSoldButton({ listingId, price, children, className, variant }: Props) {
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState<Buyers>({ status: "loading" });
  const [buyer, setBuyer] = useState(OUTSIDE);
  const [priceText, setPriceText] = useState("");
  const [pending, startTransition] = useTransition();

  async function loadBuyers() {
    setBuyers({ status: "loading" });
    const result = await getBuyerCandidates(listingId);
    setBuyers(result.ok ? { status: "ready", list: result.buyers } : { status: "error", error: result.error });
  }

  function openDialog() {
    setBuyer(OUTSIDE);
    setPriceText(price !== null ? formatNumber(price) : "");
    setOpen(true);
    void loadBuyers();
  }

  function submit() {
    startTransition(async () => {
      const result = await markListingSold({
        listingId,
        buyerId: buyer === OUTSIDE ? null : buyer,
        finalPrice: parseDigits(priceText) ?? null,
      });
      if (result.ok) {
        toast.success("Đã đánh dấu tin là đã bán");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const finalPrice = parseDigits(priceText);
  const options: { id: string; name: string; avatarUrl: string | null }[] = [
    ...(buyers.status === "ready" ? buyers.list.map((b) => ({ ...b, name: b.name ?? "Người dùng" })) : []),
    { id: OUTSIDE, name: "Người mua ngoài nền tảng", avatarUrl: null },
  ];

  return (
    <>
      <Button variant={variant} className={className} onClick={openDialog}>
        {children}
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đánh dấu đã bán</DialogTitle>
            <DialogDescription>Tin sẽ chuyển sang “Đã bán” và không hiện trên bản đồ nữa.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Bạn đã bán cho ai?</legend>
              {buyers.status === "loading" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang tải người đã chat...
                </p>
              )}
              {buyers.status === "error" && (
                <p className="text-sm text-destructive">
                  {buyers.error}{" "}
                  <button type="button" className="underline" onClick={() => void loadBuyers()}>
                    Thử lại
                  </button>
                </p>
              )}
              <div className="max-h-60 space-y-1 overflow-y-auto" role="radiogroup">
                {options.map((o) => (
                  <label
                    key={o.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      buyer === o.id ? "border-primary bg-primary/5" : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="buyer"
                      value={o.id}
                      checked={buyer === o.id}
                      onChange={() => setBuyer(o.id)}
                      className="size-4 accent-primary"
                    />
                    {o.id === OUTSIDE ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <UserRound className="size-4 text-muted-foreground" />
                      </span>
                    ) : (
                      <Avatar className="size-8">
                        {o.avatarUrl && <AvatarImage src={o.avatarUrl} alt="" />}
                        <AvatarFallback>{o.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  </label>
                ))}
              </div>
              {buyers.status === "ready" && buyers.list.length === 0 && (
                <p className="text-xs text-muted-foreground">Chưa có ai chat về tin này.</p>
              )}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="final-price">Giá chốt (đ)</Label>
              <NumberInput
                id="final-price"
                value={priceText}
                onChange={setPriceText}
                placeholder={price === null ? "Thỏa thuận" : undefined}
                className="h-11"
              />
              {finalPrice !== undefined && finalPrice >= 1000 && (
                <p className="text-xs text-muted-foreground">= {formatPriceShort(finalPrice)}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={pending} onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button className="h-11" disabled={pending} onClick={submit}>
              {pending && <Loader2 className="animate-spin" />} Xác nhận đã bán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
