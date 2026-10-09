import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { param, requireAdminPage } from "@/lib/admin";
import { CategoryForm } from "../category-form";
import { loadAdminCategories } from "../data";

export const metadata: Metadata = { title: "Thêm danh mục" };

/** /admin/danh-muc/moi: thêm danh mục chính; ?cha=<id>: thêm danh mục con. */
export default async function NewCategoryPage({ searchParams }: PageProps<"/admin/danh-muc/moi">) {
  const { supabase } = await requireAdminPage("/admin/danh-muc/moi");
  const parentParam = param((await searchParams).cha);

  const tree = await loadAdminCategories(supabase);
  if (!tree) throw new Error("Không tải được danh mục");
  const parent = parentParam ? tree.find((m) => m.id === Number(parentParam)) : undefined;
  if (parentParam && !parent) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/danh-muc" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Danh mục
      </Link>
      <PageTitle title={parent ? `Thêm danh mục con của ${parent.name}` : "Thêm danh mục chính"} />
      <CategoryForm parentId={parent?.id ?? null} mains={tree} />
    </div>
  );
}
