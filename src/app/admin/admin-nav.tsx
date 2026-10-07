"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, LayoutDashboard, ListChecks, Newspaper, ScrollText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/nguoi-dung", label: "Người dùng", icon: Users },
  { href: "/admin/tin-dang", label: "Tin đăng", icon: ListChecks },
  { href: "/admin/danh-muc", label: "Danh mục", icon: FolderTree },
  { href: "/admin/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/admin/nhat-ky", label: "Nhật ký", icon: ScrollText },
];

/** Menu khu vực Admin: cột trái trên máy tính, dải cuộn ngang trên điện thoại. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu quản trị">
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] md:flex-col md:overflow-visible md:px-3 md:py-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
