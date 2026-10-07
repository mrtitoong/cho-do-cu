import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostListingForm, type EditingListing } from "@/app/dang-tin/post-listing-form";
import { PageTitle } from "@/components/layout/page-title";
import { findSubCategory, getCategoryTree } from "@/lib/categories";
import { requireUser } from "@/lib/auth";
import { toFormValues } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sửa tin" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditListingPage({ params }: PageProps<"/tin/[id]/sua">) {
  const { id } = await params;
  const user = await requireUser(`/tin/${id}/sua`);
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: listing, error }, { data: point }, categories] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, title, description, price, attributes, address_text, province, district,
         category:categories(slug),
         images:listing_images(path, sort_order)`,
      )
      .eq("id", id)
      .eq("seller_id", user.id)
      .maybeSingle(),
    // Cột location bị ẩn với mọi người; chủ tin đọc vị trí thật qua hàm riêng
    supabase.rpc("get_my_listing_location", { p_listing_id: id }).maybeSingle(),
    getCategoryTree(),
  ]);
  if (error) console.error("EditListingPage:", error);

  // Tin không tồn tại hoặc không phải của mình → 404 (không tiết lộ tin có tồn tại hay không)
  const sub = findSubCategory(categories, listing?.category?.slug);
  if (!listing || !sub) notFound();

  const editing: EditingListing = {
    id: listing.id,
    subSlug: sub.slug,
    values: toFormValues(sub, { ...listing, attributes: (listing.attributes ?? {}) as Record<string, unknown> }),
    imagePaths: [...listing.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.path),
    location: point
      ? {
          lat: point.lat,
          lng: point.lng,
          addressText: listing.address_text,
          province: listing.province,
          district: listing.district,
        }
      : null,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Sửa tin" description="Cập nhật thông tin, ảnh hoặc vị trí của tin." />
      <PostListingForm userId={user.id} categories={categories} editing={editing} />
    </div>
  );
}
