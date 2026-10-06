const numberFormat = new Intl.NumberFormat("vi-VN");
const shortFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** 1500000 → "1.500.000" */
export function formatNumber(n: number) {
  return numberFormat.format(n);
}

/** Lấy phần chữ số của chuỗi người dùng gõ: "1.500.000 đ" → 1500000 (rỗng → undefined). */
export function parseDigits(text: string): number | undefined {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

/** 1500000 → "1.500.000 đ" */
export function formatPrice(n: number) {
  return `${formatNumber(n)} đ`;
}

/** Giá rút gọn cho thẻ tin: 1500000 → "1,5 triệu", 2300000000 → "2,3 tỷ", 500000 → "500 nghìn". */
export function formatPriceShort(n: number) {
  if (n >= 1_000_000_000) return `${shortFormat.format(n / 1_000_000_000)} tỷ`;
  if (n >= 1_000_000) return `${shortFormat.format(n / 1_000_000)} triệu`;
  if (n >= 1_000) return `${shortFormat.format(n / 1_000)} nghìn`;
  return formatPrice(n);
}
