import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SearchPage } from "@/components/search/search-page";
import { createClient } from "@/lib/supabase/server";

// Trang chủ: tìm tin theo bản đồ. Toàn bộ bộ lọc nằm trên URL, dữ liệu tải phía trình duyệt qua RPC search_listings.
export default async function HomePage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase.from("categories").select("id, slug, parent_id");
  if (error) throw new Error(`Không tải được danh mục: ${error.message}`);

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
