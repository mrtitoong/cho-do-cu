import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SearchPage } from "@/components/search/search-page";
import { getCategoryTree } from "@/lib/categories";

export const metadata: Metadata = { title: "Tìm kiếm trên bản đồ" };

// Tìm tin theo bản đồ. Toàn bộ bộ lọc nằm trên URL, dữ liệu tải phía trình duyệt qua RPC search_listings.
export default async function SearchRoutePage() {
  const categories = await getCategoryTree();

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải...
        </div>
      }
    >
      <SearchPage categories={categories} />
    </Suspense>
  );
}
