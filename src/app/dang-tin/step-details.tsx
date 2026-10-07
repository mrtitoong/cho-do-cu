"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolvePricing, type SubCategory } from "@/lib/category-tree";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  type ListingFormValues,
} from "@/lib/listing-schema";
import { AttributeField, shortMoney } from "./attribute-field";
import { FormField, WithUnit } from "./form-field";
import { NumberInput } from "@/components/number-input";

type Props = { sub: SubCategory; form: UseFormReturn<ListingFormValues> };

function Counter({ length, min, max }: { length: number; min: number; max: number }) {
  return (
    <span className={length > 0 && (length < min || length > max) ? "text-destructive" : undefined}>
      {length}/{max} ký tự (tối thiểu {min})
    </span>
  );
}

export function StepDetails({ sub, form }: Props) {
  const { control, register, formState } = form;
  const [title, description, price, negotiable, attributes] = useWatch({
    control,
    name: ["title", "description", "price", "negotiable", "attributes"],
  });
  const pricing = resolvePricing(sub, attributes);
  const salaryField = sub.fields.find((f) => f.key === sub.priceFromField);
  const otherFields = sub.fields.filter((f) => f.key !== sub.priceFromField);
  const priceHint = shortMoney(price);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-semibold">Thông tin chung</h2>

        <FormField
          id="title"
          label="Tiêu đề"
          required
          error={formState.errors.title?.message}
          hint={<Counter length={title.trim().length} min={TITLE_MIN} max={TITLE_MAX} />}
        >
          <Input
            id="title"
            className="h-11"
            maxLength={TITLE_MAX + 10}
            placeholder="VD: Bán xe Honda Vision 2021 chính chủ"
            aria-invalid={Boolean(formState.errors.title)}
            aria-describedby={formState.errors.title ? "title-error" : undefined}
            {...register("title")}
          />
        </FormField>

        <div className="space-y-3">
          {salaryField ? (
            <AttributeField
              field={salaryField}
              control={control}
              label={pricing.label}
              required={!negotiable}
              disabled={negotiable}
            />
          ) : (
            <Controller
              control={control}
              name="price"
              render={({ field, fieldState }) => (
                <FormField
                  id="price"
                  label={pricing.label}
                  required={!negotiable}
                  error={fieldState.error?.message}
                  hint={priceHint && !negotiable ? `= ${priceHint}` : undefined}
                >
                  <WithUnit unit={pricing.unit === "month" ? "đ/tháng" : "đ"}>
                    <NumberInput
                      id="price"
                      name={field.name}
                      ref={field.ref}
                      className="h-11 pr-20"
                      placeholder="VD: 1.500.000"
                      disabled={negotiable}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={Boolean(fieldState.error)}
                      aria-describedby={fieldState.error ? "price-error" : undefined}
                    />
                  </WithUnit>
                </FormField>
              )}
            />
          )}

          <Controller
            control={control}
            name="negotiable"
            render={({ field }) => (
              <div className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id="negotiable"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                    // ô giá bị khóa khi thỏa thuận → xóa giá trị cũ để không kẹt lỗi
                    if (checked !== true) return;
                    if (salaryField) form.setValue(`attributes.${salaryField.key}`, { min: "", max: "" });
                    else form.setValue("price", "");
                    form.clearErrors(salaryField ? `attributes.${salaryField.key}` : "price");
                  }}
                />
                <Label htmlFor="negotiable" className="font-normal">
                  {salaryField ? "Lương thỏa thuận" : "Giá thỏa thuận"}
                </Label>
              </div>
            )}
          />
        </div>

        <FormField
          id="description"
          label="Mô tả chi tiết"
          required
          error={formState.errors.description?.message}
          hint={<Counter length={description.trim().length} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />}
        >
          <Textarea
            id="description"
            rows={6}
            maxLength={DESCRIPTION_MAX + 100}
            placeholder="Mô tả tình trạng, xuất xứ, lý do bán, thời gian có thể xem hàng..."
            aria-invalid={Boolean(formState.errors.description)}
            aria-describedby={formState.errors.description ? "description-error" : undefined}
            {...register("description")}
          />
        </FormField>
      </section>

      {otherFields.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold">Thông tin chi tiết về {sub.name.toLowerCase()}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherFields.map((field) => (
              <AttributeField key={`${sub.slug}-${field.key}`} field={field} control={control} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
