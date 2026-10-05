import Link from "next/link";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 font-bold", className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Store className="size-5" />
      </span>
      <span className="hidden text-lg text-primary sm:inline">Chợ Đồ Cũ</span>
    </Link>
  );
}
