import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin";
import { CategoryTreeManager } from "./category-tree-manager";
import { loadAdminCategories } from "./data";

export const metadata: Metadata = { title: "Danh mục" };

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdminPage("/admin/danh-muc");
  const tree = await loadAdminCategories(supabase);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="Danh mục"
          description="Kéo thả để đổi thứ tự. Danh mục đang có tin chỉ ẩn được, không xóa được."
        />
        <Button asChild className="h-10">
          <Link href="/admin/danh-muc/moi">
            <Plus /> Thêm danh mục chính
          </Link>
        </Button>
      </div>
      {tree ? (
        <CategoryTreeManager tree={tree} />
      ) : (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          Không tải được danh mục, vui lòng tải lại trang.
        </p>
      )}
    </div>
  );
}
