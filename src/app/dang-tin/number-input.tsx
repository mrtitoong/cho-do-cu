"use client";

import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> & {
  value: string;
  onChange: (value: string) => void;
  /** Cho phép phần thập phân (VD diện tích 45,5); mặc định là số nguyên có dấu chấm hàng nghìn. */
  decimal?: boolean;
};

const MAX_DIGITS = 15;

/** Ô nhập số: số nguyên tự thêm dấu chấm hàng nghìn khi gõ ("1500000" → "1.500.000"). */
export function NumberInput({ value, onChange, decimal, ...props }: Props) {
  function handleChange(raw: string) {
    if (decimal) {
      // giữ chữ số và một dấu thập phân (, hoặc .)
      const cleaned = raw.replace(/[^\d.,]/g, "");
      const match = cleaned.match(/^\d*([.,]\d*)?/);
      onChange(match ? match[0] : "");
      return;
    }
    const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
    onChange(digits ? formatNumber(Number(digits)) : "");
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
