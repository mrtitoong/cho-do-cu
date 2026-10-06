"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <title>Đã xảy ra lỗi | Chợ Đồ Cũ</title>
      <TriangleAlert className="size-14 text-destructive" strokeWidth={1.5} />
      <div>
        <h1 className="text-2xl font-bold">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-muted-foreground">
          Trang chưa tải được. Vui lòng thử lại, nếu vẫn lỗi hãy quay lại sau ít phút.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Mã lỗi: {error.digest}</p>}
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button className="h-11" onClick={() => retry()}>
          Thử lại
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
