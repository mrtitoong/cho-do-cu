import Link from "next/link";
import { ListingImage } from "@/components/listing-image";
import { Skeleton } from "@/components/ui/skeleton";
import { getMainCategory, type PriceUnit } from "@/config/categories";
import { formatDistance, formatTimeAgo } from "@/lib/format";
import { formatListingPrice } from "@/lib/listing-schema";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "./use-search-listings";

type Props = { item: SearchResultItem; mainSlug: string | undefined };

function Cover({ item, mainSlug, sizes, className }: Props & { sizes: string; className?: string }) {
  const main = mainSlug ? getMainCategory(mainSlug) : undefined;
  if (item.cover_image_path) {
    return <ListingImage path={item.cover_image_path} sizes={sizes} className={className} />;
  }
  const Icon = main?.icon;
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ backgroundColor: `${main?.color ?? "#64748b"}1a`, color: main?.color }}
    >
      {Icon && <Icon className="size-8 opacity-70" />}
    </div>
  );
}

const price = (item: SearchResultItem) =>
  formatListingPrice(item.price, item.price_unit as PriceUnit, { short: true });

const area = (item: SearchResultItem) => [item.district, item.province].filter(Boolean).join(", ");

/** Thẻ tin trong danh sách kết quả. */
export function ListingCard({
  item,
  mainSlug,
  onHover,
}: Props & { onHover?: (id: string | null) => void }) {
  // Chỉ gắn sự kiện khi có onHover → dùng được cả trong Server Component (VD "Tin tương tự")
  const hoverProps = onHover && {
    onMouseEnter: () => onHover(item.id),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(item.id),
    onBlur: () => onHover(null),
  };
  return (
    <Link
      href={`/tin/${item.id}`}
      {...hoverProps}
      className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <Cover item={item} mainSlug={mainSlug} sizes="128px" className="size-24 shrink-0 rounded-lg sm:h-24 sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h3>
        <p className="mt-1 font-semibold text-primary">{price(item)}</p>
        <p className="mt-auto truncate text-xs text-muted-foreground">
          {[
            area(item),
            item.distance_m !== null ? formatDistance(item.distance_m) : null,
            formatTimeAgo(item.created_at),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}

/** Thẻ nhỏ hiện khi bấm ghim trên bản đồ. */
export function ListingPopupCard({ item, mainSlug }: Props) {
  return (
    <Link href={`/tin/${item.id}`} className="block w-56 overflow-hidden rounded-xl text-foreground no-underline">
      <Cover item={item} mainSlug={mainSlug} sizes="224px" className="h-28 w-full" />
      <div className="space-y-0.5 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
        <p className="font-semibold text-primary">{price(item)}</p>
        {item.distance_m !== null && (
          <p className="text-xs text-muted-foreground">Cách {formatDistance(item.distance_m)}</p>
        )}
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex gap-3 p-2">
      <Skeleton className="size-24 shrink-0 rounded-lg sm:w-32" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
