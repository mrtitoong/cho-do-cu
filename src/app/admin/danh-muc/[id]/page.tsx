import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { requireAdminPage } from "@/lib/admin";
import { CategoryForm } from "../category-form";
import { loadAdminCategories } from "../data";

export const metadata: Metadata = { title: "Sửa danh mục" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/danh-muc/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdminPage(`/admin/danh-muc/${id}`);
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) notFound();

  const tree = await loadAdminCategories(supabase);
  if (!tree) throw new Error("Không tải được danh mục");
  const category = tree.flatMap((m) => [m, ...m.children]).find((c) => c.id === categoryId);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/danh-muc" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Danh mục
      </Link>
      <PageTitle
        title={`Sửa: ${category.name}`}
        description={`${category.active_listings.toLocaleString("vi-VN")} tin đang bán · ${category.total_listings.toLocaleString("vi-VN")} tin tất cả trạng thái`}
      />
      {/* key: lưu xong quay lại sửa tiếp thì form lấy dữ liệu mới từ server */}
      <CategoryForm
        key={JSON.stringify(category)}
        category={category}
        parentId={category.parent_id}
        mains={tree}
      />
    </div>
  );
}
