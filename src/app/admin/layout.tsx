import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin";
import { getSessionUser } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s | Quản trị Chợ Đồ Cũ" },
  robots: { index: false, follow: false },
};

// Lớp 2/3: kiểm tra lại quyền admin trên server (proxy.ts đã chặn trước).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-muted/30">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-5 text-primary" />
          <span>Quản trị Chợ Đồ Cũ</span>
        </Link>
        <span className="ml-auto hidden truncate text-sm text-muted-foreground sm:inline">
          {user?.name ?? user?.email ?? "Admin"}
        </span>
        <Button asChild variant="outline" className="ml-auto h-9 sm:ml-0">
          <Link href="/">
            <ArrowLeft /> Về trang web
          </Link>
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b bg-background md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-56 md:border-r md:border-b-0">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
