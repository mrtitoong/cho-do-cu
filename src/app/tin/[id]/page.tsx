import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { ListingCard } from "@/components/search/listing-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMainCategory } from "@/config/categories";
import { formatTimeAgo } from "@/lib/format";
import { listingImageUrl } from "@/lib/listing-images";
import { describeAttributes } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";
import { AreaMapLoader } from "./area-map-loader";
import { ContactActions } from "./contact-actions";
import { countActiveListings, getListing, getSellerPhoneHint, getSimilarListings, type ListingDetail } from "./data";
import { ImageGallery } from "./image-gallery";

type Props = PageProps<"/tin/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return { title: "Không tìm thấy tin" };

  const summary = [listing.priceText, listing.area].filter(Boolean).join(" · ");
  const description = `${summary}. ${listing.description.replace(/\s+/g, " ")}`.slice(0, 160);
  const cover = listing.images[0];
  return {
    title: listing.title,
    description,
    openGraph: {
      type: "website",
      siteName: "Chợ Đồ Cũ",
      locale: "vi_VN",
      title: listing.title,
      description,
      images: cover ? [{ url: listingImageUrl(cover.path), alt: listing.title }] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary" },
  };
}

const joinedText = (date: string) => {
  const d = new Date(date);
  return `Tham gia tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};

function SellerCard({ seller, activeCount }: { seller: NonNullable<ListingDetail["seller"]>; activeCount: number }) {
  const name = seller.full_name?.trim() || "Người dùng Chợ Đồ Cũ";
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <Avatar className="size-12">
        {seller.avatar_url && <AvatarImage src={seller.avatar_url} alt="" />}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">
          {joinedText(seller.created_at)} · {activeCount} tin đang bán
        </p>
      </div>
    </div>
  );
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const supabase = await createClient();
  const [{ data: auth }, activeCount, similar, phoneHint] = await Promise.all([
    supabase.auth.getClaims(),
    countActiveListings(listing.seller_id),
    getSimilarListings(listing),
    listing.status === "active" ? getSellerPhoneHint(listing.id) : Promise.resolve(null),
  ]);
  const viewerId = auth?.claims?.sub ?? null;
  const isOwner = viewerId === listing.seller_id;

  const { sub } = listing;
  const main = sub ? getMainCategory(sub.parent) : undefined;
  const rows = sub ? describeAttributes(sub, listing.attributes).filter((r) => r.key !== sub.priceFromField) : [];
  const priceLabel = sub?.priceFromField ? "Mức lương" : null;
  const sold = listing.status === "sold";
  const hasActions = isOwner || listing.status === "active";
  const actionProps = {
    listingId: listing.id,
    status: listing.status,
    isOwner,
    loggedIn: Boolean(viewerId),
    phoneHint,
  };

  return (
    <div className={hasActions ? "pb-20 md:pb-0" : undefined}>
      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 md:px-4 md:py-6">
        {/* Cột chính */}
        <div className="min-w-0 space-y-6">
          <ImageGallery title={listing.title} paths={listing.images.map((i) => i.path)} />

          <div className="space-y-6 px-4 md:px-0">
            <div>
              {sub && (
                <p className="text-xs text-muted-foreground">
                  {main?.name} › {sub.name}
                </p>
              )}
              <h1 className="mt-1 text-xl font-bold break-words md:text-2xl">
                {sold && (
                  <span className="mr-2 inline-block rounded bg-muted px-2 py-0.5 align-middle text-sm font-semibold text-muted-foreground">
                    Đã bán
                  </span>
                )}
                {listing.title}
              </h1>
              <p className="mt-2 text-xl font-bold text-red-600">
                {priceLabel && <span className="mr-1 text-sm font-medium text-muted-foreground">{priceLabel}:</span>}
                {listing.priceText}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {listing.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4 shrink-0" /> {listing.area}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-4 shrink-0" />
                  <time dateTime={listing.created_at}>Đăng {formatTimeAgo(listing.created_at)}</time>
                </span>
              </div>
            </div>

            {rows.length > 0 && (
              <section className="border-t pt-4">
                <h2 className="mb-3 font-semibold">Thông số</h2>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {rows.map((r) => (
                    <div key={r.key} className="flex justify-between gap-4 border-b border-dashed pb-2 sm:justify-start">
                      <dt className="text-muted-foreground sm:w-36 sm:shrink-0">{r.label}</dt>
                      <dd className="text-right font-medium sm:text-left">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="border-t pt-4">
              <h2 className="mb-2 font-semibold">Mô tả</h2>
              <p className="text-sm leading-relaxed break-words whitespace-pre-line">{listing.description}</p>
            </section>

            {listing.point && (
              <section className="border-t pt-4">
                <h2 className="mb-1 font-semibold">Khu vực</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Vị trí chính xác được ẩn, vòng tròn chỉ là khu vực gần đúng.
                </p>
                <AreaMapLoader lat={listing.point.lat} lng={listing.point.lng} />
              </section>
            )}

            {/* Người bán trên điện thoại */}
            {listing.seller && (
              <section className="md:hidden">
                <SellerCard seller={listing.seller} activeCount={activeCount} />
              </section>
            )}
          </div>
        </div>

        {/* Cột phải (máy tính): người bán + nút hành động */}
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-4">
            {listing.seller && <SellerCard seller={listing.seller} activeCount={activeCount} />}
            <ContactActions layout="sidebar" {...actionProps} />
          </div>
        </aside>
      </div>

      <ContactActions layout="bottom-bar" {...actionProps} />

      {similar.length > 0 && (
        <section className="mx-auto w-full max-w-5xl border-t px-4 py-6 md:mt-4">
          <h2 className="mb-3 font-semibold">Tin tương tự</h2>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <ListingCard key={item.id} item={item} mainSlug={sub?.parent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
