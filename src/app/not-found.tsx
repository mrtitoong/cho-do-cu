import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <SearchX className="size-14 text-muted-foreground" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-semibold text-primary">Lỗi 404</p>
        <h1 className="mt-1 text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="mt-2 text-muted-foreground">
          Trang bạn tìm không tồn tại, hoặc tin đăng đã bị ẩn hay xóa.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button asChild className="h-11">
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/dang-tin">Đăng tin</Link>
        </Button>
      </div>
    </div>
  );
}
