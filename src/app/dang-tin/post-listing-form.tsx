"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findSubCategory, type CategoryTree } from "@/lib/category-tree";
import { imagesRequired } from "@/lib/listing-images";
import type { ListingLocation } from "@/lib/listing-location";
import { buildZodSchema, emptyAttributes, type ListingFormValues } from "@/lib/listing-schema";
import { createListing, updateListing } from "./actions";
import { StepCategory } from "./step-category";
import { StepDetails } from "./step-details";
import { StepImages } from "./step-images";
import { StepLocation } from "./step-location";
import { StepPreview } from "./step-preview";
import { useImageUploads } from "./use-image-uploads";

const STEPS = ["Danh mục", "Thông tin", "Ảnh", "Vị trí", "Xem trước"] as const;
const DETAILS_STEP = 1;
const IMAGES_STEP = 2;
const LOCATION_STEP = 3;
const PREVIEW_STEP = 4;
const STEP_INDEX = { details: DETAILS_STEP, images: IMAGES_STEP, location: LOCATION_STEP } as const;

const DEFAULT_VALUES: ListingFormValues = {
  title: "",
  description: "",
  negotiable: false,
  price: "",
  attributes: {},
};

/** Dữ liệu tin đang sửa (trang /tin/[id]/sua). */
export type EditingListing = {
  id: string;
  subSlug: string;
  values: ListingFormValues;
  imagePaths: string[];
  location: ListingLocation | null;
};

type Props = {
  userId: string;
  /** Cây danh mục đọc từ DB (getCategoryTree) */
  categories: CategoryTree;
  editing?: EditingListing;
};

export function PostListingForm({ userId, categories, editing }: Props) {
  const router = useRouter();
  // Sửa tin: mở thẳng bước Thông tin; vẫn quay lại đổi được danh mục con, nhưng khóa danh mục chính
  const [step, setStep] = useState(editing ? DETAILS_STEP : 0);
  const lockedMain = editing ? (findSubCategory(categories, editing.subSlug)?.parent ?? null) : null;
  const [mainSlug, setMainSlug] = useState<string | null>(lockedMain);
  const [subSlug, setSubSlug] = useState<string | null>(editing?.subSlug ?? null);
  // id của tin sinh sẵn để upload ảnh vào {user_id}/{listing_id}/ trước khi tin được ghi vào DB
  const [listingId] = useState(() => editing?.id ?? crypto.randomUUID());
  const uploads = useImageUploads(userId, listingId, editing?.imagePaths);
  const [location, setLocation] = useState<ListingLocation | null>(editing?.location ?? null);
  const [stepError, setStepError] = useState<string | undefined>();
  const [submitting, startSubmit] = useTransition();

  const sub = findSubCategory(categories, subSlug);
  const schema = useMemo(() => (sub ? buildZodSchema(sub.fields, sub.priceLabel) : undefined), [sub]);
  // Form giữ giá trị thô (chuỗi); schema chỉ dùng để kiểm tra, server tự parse lại.
  const resolver = useMemo(
    () => (schema ? (zodResolver(schema) as unknown as Resolver<ListingFormValues>) : undefined),
    [schema],
  );
  const form = useForm<ListingFormValues>({ defaultValues: editing?.values ?? DEFAULT_VALUES, resolver, mode: "onTouched" });

  function goTo(next: number) {
    setStep(next);
    setStepError(undefined);
    window.scrollTo({ top: 0 });
  }

  function handleMainChange(slug: string) {
    if (lockedMain && slug !== lockedMain) return;
    setMainSlug(slug);
    if (sub && sub.parent !== slug) handleSubChange(null);
  }

  function handleSubChange(slug: string | null) {
    if (slug === subSlug) return;
    setSubSlug(slug);
    // đổi danh mục → xóa các trường riêng của danh mục cũ
    const next = findSubCategory(categories, slug);
    form.reset({ ...form.getValues(), attributes: next ? emptyAttributes(next) : {} });
  }

  /** Lỗi chặn không cho rời bước Ảnh / Vị trí (undefined = hợp lệ). */
  function blockingError(target: number) {
    if (target === IMAGES_STEP) {
      if (uploads.busy) return "Vui lòng chờ ảnh tải lên xong.";
      if (uploads.failed) return 'Có ảnh tải lên bị lỗi. Bấm "Thử lại" hoặc xóa ảnh đó.';
      if (sub && imagesRequired(sub) && uploads.items.length === 0) return "Vui lòng thêm ít nhất 1 ảnh.";
    }
    if (target === LOCATION_STEP && !location) return "Vui lòng chọn vị trí trên bản đồ.";
    return undefined;
  }

  async function handleNext() {
    if (step === DETAILS_STEP && !(await form.trigger(undefined, { shouldFocus: true }))) return;
    const error = blockingError(step);
    if (error) {
      setStepError(error);
      return;
    }
    goTo(step + 1);
  }

  function handleSubmit() {
    if (!subSlug) return;
    startSubmit(async () => {
      const input = { listingId, categorySlug: subSlug, values: form.getValues(), imagePaths: uploads.paths, location };
      const result = editing ? await updateListing(input) : await createListing(input);
      if (result.ok) {
        toast.success(editing ? "Đã lưu thay đổi" : "Đăng tin thành công!");
        router.push(`/tin/${result.id}`);
        return;
      }
      toast.error(result.error);
      // server đã xóa ảnh để không để lại rác → tải lại từ bản nén còn giữ trên trình duyệt
      if ("imagesRemoved" in result && result.imagesRemoved) uploads.reuploadAll();
      if (result.fieldErrors) {
        for (const [path, message] of Object.entries(result.fieldErrors)) {
          form.setError(path as FieldPath<ListingFormValues>, { message });
        }
      }
      if (result.step) {
        goTo(STEP_INDEX[result.step]);
        if (result.step !== "details") setStepError(result.error);
      }
    });
  }

  const preview = step === PREVIEW_STEP && schema ? schema.safeParse(form.getValues()) : undefined;
  const notReady = step === PREVIEW_STEP ? (blockingError(IMAGES_STEP) ?? blockingError(LOCATION_STEP)) : undefined;

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
          categories={categories}
          mainSlug={mainSlug}
          subSlug={subSlug}
          lockedMain={lockedMain}
          onMainChange={handleMainChange}
          onSubChange={handleSubChange}
        />
      )}
      {step === DETAILS_STEP && sub && <StepDetails sub={sub} form={form} />}
      {step === IMAGES_STEP && sub && <StepImages uploads={uploads} required={imagesRequired(sub)} error={stepError} />}
      {step === LOCATION_STEP && <StepLocation value={location} onChange={setLocation} error={stepError} />}
      {step === PREVIEW_STEP && sub && preview?.success && (
        <StepPreview
          sub={sub}
          data={preview.data}
          coverUrl={uploads.items[0]?.previewUrl}
          imageCount={uploads.items.length}
          location={location}
        />
      )}
      {step === PREVIEW_STEP && preview && !preview.success && (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          Thông tin chưa hợp lệ. Vui lòng quay lại bước &quot;Thông tin&quot; để sửa.
        </p>
      )}
      {notReady && preview?.success && (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">{notReady}</p>
      )}

      <div className="flex gap-3 border-t pt-4">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => goTo(step - 1)} disabled={submitting}>
            <ArrowLeft /> Quay lại
          </Button>
        )}
        {step < PREVIEW_STEP ? (
          <Button type="button" className="ml-auto h-11 flex-1 sm:flex-none" onClick={handleNext} disabled={!sub}>
            Tiếp tục <ArrowRight />
          </Button>
        ) : (
          <Button
            type="button"
            className="ml-auto h-11 flex-1 sm:flex-none"
            onClick={handleSubmit}
            disabled={submitting || !preview?.success || Boolean(notReady)}
          >
            {submitting && <Loader2 className="animate-spin" />}
            {editing ? "Lưu thay đổi" : "Đăng tin"}
          </Button>
        )}
      </div>
      {step === 0 && !sub && (
        <p className="-mt-3 text-right text-xs text-muted-foreground">Chọn danh mục chính và danh mục con để tiếp tục.</p>
      )}
    </div>
  );
}
