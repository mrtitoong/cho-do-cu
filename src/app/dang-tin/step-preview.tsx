import { ImageIcon, MapPin } from "lucide-react";
import { getMainCategory, resolvePricing, type SubCategory } from "@/config/categories";
import {
  describeAttributes,
  formatAttributeValue,
  formatListingPrice,
  type ParsedListing,
} from "@/lib/listing-schema";
import type { ListingLocation } from "@/lib/listing-location";

type Props = {
  sub: SubCategory;
  data: ParsedListing;
  coverUrl?: string;
  imageCount: number;
  location: ListingLocation | null;
};

export function StepPreview({ sub, data, coverUrl, imageCount, location }: Props) {
  const attributes = data.attributes as Record<string, unknown>;
  const { label, unit } = resolvePricing(sub, attributes);
  const salaryField = sub.fields.find((f) => f.key === sub.priceFromField);

  const priceText = data.negotiable
    ? "Thỏa thuận"
    : salaryField
      ? formatAttributeValue(salaryField, attributes[salaryField.key])
      : formatListingPrice(data.price ?? null, unit);
  const rows = describeAttributes(sub, attributes).filter((r) => r.key !== sub.priceFromField);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Kiểm tra lại tin trước khi đăng. Bấm &quot;Quay lại&quot; để sửa.</p>

      <article className="overflow-hidden rounded-xl border">
        {coverUrl ? (
          <div className="relative aspect-[16/9] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước là blob: URL cục bộ */}
            <img src={coverUrl} alt="Ảnh bìa" className="size-full object-cover" />
            {imageCount > 1 && (
              <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                <ImageIcon className="size-3" /> {imageCount} ảnh
              </span>
            )}
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
            <ImageIcon className="size-5" /> Không có ảnh
          </div>
        )}

        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {getMainCategory(sub.parent)?.name} › {sub.name}
            </p>
            <h2 className="mt-1 text-xl font-semibold break-words">{data.title}</h2>
            <p className="mt-2 text-lg font-bold text-red-600">
              <span className="sr-only">{label}: </span>
              {priceText}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {location ? (location.addressText ?? "Đã chọn vị trí trên bản đồ") : "Chưa chọn vị trí"}
            </p>
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
            <h3 className="mb-2 font-semibold">Mô tả</h3>
            <p className="text-sm break-words whitespace-pre-line">{data.description}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
