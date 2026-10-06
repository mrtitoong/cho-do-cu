"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CircleCheck, ImageIcon, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getSubCategory, type MainCategorySlug } from "@/config/categories";
import { buildZodSchema, emptyAttributes, type ListingFormValues } from "@/lib/listing-schema";
import { createListing } from "./actions";
import { StepCategory } from "./step-category";
import { StepDetails } from "./step-details";
import { StepPreview } from "./step-preview";

const STEPS = ["Danh mục", "Thông tin", "Ảnh", "Vị trí", "Xem trước"] as const;
const DETAILS_STEP = 1;

const DEFAULT_VALUES: ListingFormValues = {
  title: "",
  description: "",
  negotiable: false,
  price: "",
  attributes: {},
};

function ComingSoon({ icon: Icon, text }: { icon: typeof ImageIcon; text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      <Icon className="size-8" strokeWidth={1.5} />
      {text}
    </div>
  );
}

export function PostListingForm() {
  const [step, setStep] = useState(0);
  const [mainSlug, setMainSlug] = useState<MainCategorySlug | null>(null);
  const [subSlug, setSubSlug] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const sub = subSlug ? getSubCategory(subSlug) : undefined;
  const schema = useMemo(() => (subSlug ? buildZodSchema(subSlug) : undefined), [subSlug]);
  // Form giữ giá trị thô (chuỗi); schema chỉ dùng để kiểm tra, server tự parse lại.
  const resolver = useMemo(
    () => (schema ? (zodResolver(schema) as unknown as Resolver<ListingFormValues>) : undefined),
    [schema],
  );
  const form = useForm<ListingFormValues>({ defaultValues: DEFAULT_VALUES, resolver, mode: "onTouched" });

  function goTo(next: number) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function handleMainChange(slug: MainCategorySlug) {
    setMainSlug(slug);
    if (sub && sub.parent !== slug) handleSubChange(null);
  }

  function handleSubChange(slug: string | null) {
    if (slug === subSlug) return;
    setSubSlug(slug);
    // đổi danh mục → xóa các trường riêng của danh mục cũ
    const next = slug ? getSubCategory(slug) : undefined;
    form.reset({ ...form.getValues(), attributes: next ? emptyAttributes(next) : {} });
  }

  async function handleNext() {
    if (step === DETAILS_STEP && !(await form.trigger(undefined, { shouldFocus: true }))) return;
    goTo(step + 1);
  }

  function handleSubmit() {
    if (!subSlug) return;
    startSubmit(async () => {
      const result = await createListing(subSlug, form.getValues());
      if (result.ok) {
        toast.success("Đăng tin thành công!");
        setCreatedId(result.id);
        return;
      }
      toast.error(result.error);
      if (result.fieldErrors) {
        for (const [path, message] of Object.entries(result.fieldErrors)) {
          form.setError(path as FieldPath<ListingFormValues>, { message });
        }
        goTo(DETAILS_STEP);
      }
    });
  }

  function startOver() {
    form.reset(DEFAULT_VALUES);
    setMainSlug(null);
    setSubSlug(null);
    setCreatedId(null);
    goTo(0);
  }

  if (createdId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <CircleCheck className="size-12 text-green-600" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold">Tin của bạn đã được đăng</h2>
        <p className="text-sm text-muted-foreground">Mã tin: {createdId}</p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button className="h-11" onClick={startOver}>
            Đăng tin khác
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const preview = step === STEPS.length - 1 && schema ? schema.safeParse(form.getValues()) : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">
            Bước {step + 1}/{STEPS.length}: {STEPS[step]}
          </span>
          <span className="hidden text-muted-foreground sm:inline">{STEPS.join(" · ")}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Tiến trình đăng tin" />
      </div>

      {step === 0 && (
        <StepCategory
          mainSlug={mainSlug}
          subSlug={subSlug}
          onMainChange={handleMainChange}
          onSubChange={handleSubChange}
        />
      )}
      {step === 1 && sub && <StepDetails sub={sub} form={form} />}
      {step === 2 && <ComingSoon icon={ImageIcon} text="Phần tải ảnh sẽ có trong bản cập nhật tới. Bấm Tiếp tục để bỏ qua." />}
      {step === 3 && <ComingSoon icon={MapPin} text="Phần chọn vị trí sẽ có trong bản cập nhật tới. Bấm Tiếp tục để bỏ qua." />}
      {step === 4 && sub && preview?.success && <StepPreview sub={sub} data={preview.data} />}
      {step === 4 && preview && !preview.success && (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          Thông tin chưa hợp lệ. Vui lòng quay lại bước &quot;Thông tin&quot; để sửa.
        </p>
      )}

      <div className="flex gap-3 border-t pt-4">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => goTo(step - 1)} disabled={submitting}>
            <ArrowLeft /> Quay lại
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" className="ml-auto h-11 flex-1 sm:flex-none" onClick={handleNext} disabled={!sub}>
            Tiếp tục <ArrowRight />
          </Button>
        ) : (
          <Button
            type="button"
            className="ml-auto h-11 flex-1 sm:flex-none"
            onClick={handleSubmit}
            disabled={submitting || !preview?.success}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Đăng tin
          </Button>
        )}
      </div>
      {step === 0 && !sub && (
        <p className="-mt-3 text-right text-xs text-muted-foreground">Chọn danh mục chính và danh mục con để tiếp tục.</p>
      )}
    </div>
  );
}
