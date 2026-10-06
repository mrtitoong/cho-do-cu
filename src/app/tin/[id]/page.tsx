import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { getMainCategory, getSubCategory, type PriceUnit } from "@/config/categories";
import { listingImageUrl } from "@/lib/listing-images";
import { describeAttributes, formatAttributeValue, formatListingPrice } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";

// Trang chi tiết tạm thời (giai đoạn 3b). Bản đầy đủ làm ở giai đoạn 5.

type Props = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getListing(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  // Chỉ chọn cột công khai; KHÔNG chọn location (vị trí thật)
  const { data } = await supabase
    .from("listings")
    .select(
      "id, title, description, price, price_unit, attributes, status, address_text, province, district, created_at, category:categories(slug), images:listing_images(path, sort_order)",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  return { title: listing?.title ?? "Không tìm thấy tin" };
}

export default async function ListingPage({ params }: Props) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();

  const sub = listing.category ? getSubCategory(listing.category.slug) : undefined;
  const attributes = (listing.attributes ?? {}) as Record<string, unknown>;
  const images = [...listing.images].sort((a, b) => a.sort_order - b.sort_order);
  const salaryField = sub?.fields.find((f) => f.key === sub.priceFromField);
  const priceText = salaryField
    ? (formatAttributeValue(salaryField, attributes[salaryField.key]) ?? "Thỏa thuận")
    : formatListingPrice(listing.price, listing.price_unit as PriceUnit);
  const rows = sub ? describeAttributes(sub, attributes).filter((r) => r.key !== sub.priceFromField) : [];
  const area = listing.address_text ?? [listing.district, listing.province].filter(Boolean).join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      {images.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- chuyển sang next/image ở giai đoạn 7
            <img
              key={img.path}
              src={listingImageUrl(img.path)}
              alt={`${listing.title} - ảnh ${i + 1}`}
              className="aspect-[4/3] w-full shrink-0 snap-center rounded-xl bg-muted object-cover sm:w-2/3"
            />
          ))}
        </div>
      )}

      <div>
        {sub && (
          <p className="text-xs text-muted-foreground">
            {getMainCategory(sub.parent)?.name} › {sub.name}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold break-words">{listing.title}</h1>
        <p className="mt-2 text-xl font-bold text-red-600">{priceText}</p>
        {area && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" /> {area}
          </p>
        )}
        {listing.status === "sold" && (
          <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-sm font-medium">Đã bán</span>
        )}
      </div>

      {rows.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t pt-4 text-sm sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-muted-foreground sm:w-36 sm:shrink-0">{r.label}</dt>
              <dd className="text-right font-medium sm:text-left">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="border-t pt-4">
        <h2 className="mb-2 font-semibold">Mô tả</h2>
        <p className="text-sm break-words whitespace-pre-line">{listing.description}</p>
      </div>
    </div>
  );
}
