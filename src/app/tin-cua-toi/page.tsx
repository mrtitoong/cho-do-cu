import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { findSubCategory, getCategoryTree } from "@/lib/categories";
import { requireUser } from "@/lib/auth";
import { listingPriceText } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";
import { MyListings, type MyListing } from "./my-listings";

export const metadata: Metadata = { title: "Tin của tôi" };

export default async function MyListingsPage() {
  const user = await requireUser("/tin-cua-toi");

  const supabase = await createClient();
  const [{ data, error }, categories] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, title, price, price_unit, attributes, status, province, district, created_at,
         category:categories(slug),
         images:listing_images(path, sort_order)`,
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    getCategoryTree(),
  ]);
  if (error) console.error("MyListingsPage:", error);

  const listings: MyListing[] = (data ?? []).map((row) => {
    const sub = findSubCategory(categories, row.category?.slug);
    const attributes = (row.attributes ?? {}) as Record<string, unknown>;
    const cover = [...row.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      title: row.title,
      status: row.status as MyListing["status"],
      priceText: listingPriceText(sub, { ...row, attributes }, { short: true }),
      area: [row.district, row.province].filter(Boolean).join(", "),
      createdAt: row.created_at,
      coverPath: cover?.path ?? null,
      categoryName: sub?.name ?? null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Tin của tôi" description="Quản lý các tin bạn đã đăng." />
      {error ? (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          Không tải được danh sách tin, vui lòng tải lại trang.
        </p>
      ) : (
        <MyListings listings={listings} />
      )}
    </div>
  );
}
