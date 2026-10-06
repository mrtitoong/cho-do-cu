"use client";

import { Controller, type Control, type FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CategoryField } from "@/config/categories";
import { formatPriceShort, parseDigits } from "@/lib/format";
import type { ListingFormValues, RangeInput } from "@/lib/listing-schema";
import { FormField, WithUnit } from "./form-field";
import { NumberInput } from "./number-input";

/** Lỗi của ô thường hoặc của ô khoảng (lỗi nằm ở .min / .max). */
function errorMessage(error: FieldError | undefined) {
  if (!error) return undefined;
  const nested = error as FieldError & { min?: FieldError; max?: FieldError };
  return error.message || nested.min?.message || nested.max?.message;
}

/** "1.500.000" → "1,5 triệu" (để hiện dòng nhỏ dưới ô tiền). */
export function shortMoney(text: string) {
  const n = parseDigits(text);
  return n ? formatPriceShort(n) : undefined;
}

type Props = {
  field: CategoryField;
  control: Control<ListingFormValues>;
  /** Ghi đè nhãn và trạng thái bắt buộc (VD ô lương thay cho ô giá) */
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

/** Một trường riêng của danh mục, tự sinh từ config theo field.type. */
export function AttributeField({ field, control, label = field.label, required = field.required, disabled }: Props) {
  const id = `attr-${field.key}`;

  return (
    <Controller
      control={control}
      name={`attributes.${field.key}`}
      render={({ field: input, fieldState }) => {
        const error = errorMessage(fieldState.error);
        const aria = { "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined };

        if (field.type === "range") {
          const value = (input.value as RangeInput | undefined) ?? { min: "", max: "" };
          const hints = [shortMoney(value.min), shortMoney(value.max)].filter(Boolean);
          return (
            <FormField
              id={id}
              label={field.unit ? `${label} (${field.unit})` : label}
              required={required}
              error={error}
              hint={hints.length ? `= ${hints.join(" – ")}` : undefined}
            >
              <div className="flex items-center gap-2">
                <NumberInput
                  id={id}
                  className="h-11"
                  placeholder="Từ"
                  disabled={disabled}
                  value={value.min}
                  onChange={(min) => input.onChange({ ...value, min })}
                  onBlur={input.onBlur}
                  {...aria}
                />
                <span className="text-muted-foreground">–</span>
                <NumberInput
                  aria-label={`${label} đến`}
                  className="h-11"
                  placeholder="Đến"
                  disabled={disabled}
                  value={value.max}
                  onChange={(max) => input.onChange({ ...value, max })}
                  onBlur={input.onBlur}
                  {...aria}
                />
              </div>
            </FormField>
          );
        }

        const value = (input.value as string | undefined) ?? "";
        const common = {
          id,
          name: input.name,
          ref: input.ref,
          onBlur: input.onBlur,
          disabled,
          ...aria,
        };

        return (
          <FormField id={id} label={label} required={required} error={error}>
            {field.type === "select" ? (
              <NativeSelect
                {...common}
                className="w-full [&_select]:h-11"
                value={value}
                onChange={(e) => input.onChange(e.target.value)}
              >
                <NativeSelectOption value="">— Chọn {label.toLowerCase()} —</NativeSelectOption>
                {field.options?.map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : field.type === "number" ? (
              <WithUnit unit={field.unit}>
                <NumberInput
                  {...common}
                  className="h-11 pr-16"
                  decimal={field.decimal}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={input.onChange}
                />
              </WithUnit>
            ) : field.type === "year" ? (
              <Input
                {...common}
                className="h-11"
                inputMode="numeric"
                maxLength={4}
                placeholder={field.max ? `VD: ${field.max - 3}` : undefined}
                value={value}
                onChange={(e) => input.onChange(e.target.value.replace(/\D/g, ""))}
              />
            ) : (
              <Input
                {...common}
                className="h-11"
                maxLength={100}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => input.onChange(e.target.value)}
              />
            )}
          </FormField>
        );
      }}
    />
  );
}
