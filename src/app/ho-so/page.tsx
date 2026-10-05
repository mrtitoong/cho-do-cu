import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser("/ho-so");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Hồ sơ" description={`Thông tin tài khoản ${user.email ?? ""}`.trim()} />
    </div>
  );
}
