"use client";

import Link from "next/link";
import { ListChecks, LogOut, Newspaper, ShieldCheck, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(user: SessionUser) {
  const source = user.name ?? user.email ?? "?";
  return source.trim().charAt(0).toUpperCase();
}

export function UserMenu({ user, isAdmin }: { user: SessionUser | null; isAdmin: boolean }) {
  if (!user) {
    return (
      <Button asChild variant="outline" className="h-11 px-4">
        <Link href="/dang-nhap">Đăng nhập</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu tài khoản"
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback>{initials(user)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-medium text-foreground">{user.name ?? "Tài khoản"}</div>
          {user.email && <div className="truncate text-xs text-muted-foreground">{user.email}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/tin-cua-toi">
            <ListChecks /> Tin của tôi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ho-so">
            <User /> Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="md:hidden">
          <Link href="/tin-tuc">
            <Newspaper /> Tin tức
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Quản trị
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
