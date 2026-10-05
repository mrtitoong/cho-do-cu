import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth-paths";
import { getSessionUser } from "@/lib/session";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Đăng nhập" };

const ERRORS: Record<string, string> = {
  "xac-thuc": "Link xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
};

export default async function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const errorKey = typeof params.loi === "string" ? params.loi : undefined;

  // Đã đăng nhập thì không cần ở lại trang này.
  if (await getSessionUser()) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <AuthForm next={next} initialError={errorKey ? (ERRORS[errorKey] ?? ERRORS["xac-thuc"]) : undefined} />
    </div>
  );
}
