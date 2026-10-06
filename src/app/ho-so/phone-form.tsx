"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { phoneSchema } from "@/lib/phone";
import { updatePhone } from "./actions";

const schema = z.object({ phone: phoneSchema });
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const display = (phone: string | null) => (phone ?? "").replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");

export function PhoneForm({ phone }: { phone: string | null }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { phone: display(phone) },
  });

  async function onSubmit({ phone }: FormOutput) {
    const result = await updatePhone(phone ?? "");
    if (!result.ok) {
      setError("phone", { message: result.error });
      return;
    }
    reset({ phone: display(result.phone) });
    toast.success(result.phone ? "Đã lưu số điện thoại" : "Đã xóa số điện thoại");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Số điện thoại liên hệ</CardTitle>
        <CardDescription>
          Người mua đã đăng nhập bấm &quot;Liên hệ&quot; trên tin của bạn sẽ thấy số này. Để trống nếu bạn chỉ muốn
          nhận chat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="0912 345 678"
              className="h-11"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty} className="h-11">
            {isSubmitting && <Loader2 className="animate-spin" />} Lưu số điện thoại
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
