import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Đăng tin" };

export default async function PostListingPage() {
  await requireUser("/dang-tin");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Đăng tin" description="Chọn danh mục và điền thông tin để đăng tin rao vặt." />
    </div>
  );
}
