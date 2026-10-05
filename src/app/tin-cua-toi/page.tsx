import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Tin của tôi" };

export default async function MyListingsPage() {
  await requireUser("/tin-cua-toi");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <PageTitle title="Tin của tôi" description="Quản lý các tin bạn đã đăng." />
    </div>
  );
}
