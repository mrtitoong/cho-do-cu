"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, MessageCircle, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/tin-nhan", label: "Tin nhắn", icon: MessageCircle },
  { href: "/dang-tin", label: "Đăng tin", icon: Plus, primary: true },
  { href: "/tin-cua-toi", label: "Tin của tôi", icon: ListChecks },
  { href: "/ho-so", label: "Tài khoản", icon: User },
];

// Thanh điều hướng dưới đáy, chỉ hiện trên điện thoại.
export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const target = href === "/ho-so" && !loggedIn ? "/dang-nhap" : href;
          return (
            <li key={href}>
              <Link
                href={target}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {primary ? (
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Icon className="size-5" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
