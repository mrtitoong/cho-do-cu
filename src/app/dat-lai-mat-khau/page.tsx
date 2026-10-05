import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

// Người dùng tới đây từ link trong email "Quên mật khẩu" (đã có phiên tạm qua /auth/callback).
export default async function ResetPasswordPage() {
  await requireUser("/dat-lai-mat-khau");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <ResetPasswordForm />
    </div>
  );
}
