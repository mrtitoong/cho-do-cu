import Link from "next/link";
import { MessageCircle, Newspaper, PlusCircle } from "lucide-react";
import type { SessionUser } from "@/lib/session";
import { UnreadBadge } from "@/components/chat/unread-badge";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { UserMenu } from "./user-menu";

export function SiteHeader({ user, isAdmin }: { user: SessionUser | null; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Logo />
        <div className="min-w-0 flex-1 md:max-w-xl">
          <SearchBox />
        </div>
        <nav className="ml-auto hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="h-11 px-3">
            <Link href="/tin-tuc">
              <Newspaper /> Tin tức
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 px-3">
            <Link href="/tin-nhan">
              <span className="relative">
                <MessageCircle />
                <UnreadBadge />
              </span>
              Tin nhắn
            </Link>
          </Button>
          <Button asChild className="h-11 px-4">
            <Link href="/dang-tin">
              <PlusCircle /> Đăng tin
            </Link>
          </Button>
        </nav>
        <UserMenu user={user} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
