import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";

// Trang chủ tạm thời để trống; nội dung (thống kê, tin tức, tin mới) làm ở giai đoạn 8.
// Tìm kiếm theo bản đồ đã chuyển sang /tim-kiem.
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Trang chủ" />
      <Button asChild className="h-11">
        <Link href="/tim-kiem">
          <MapIcon /> Tìm tin trên bản đồ
        </Link>
      </Button>
    </div>
  );
}
