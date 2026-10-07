import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { getMyAccount, requireUser } from "@/lib/auth";
import { getCategoryTree } from "@/lib/categories";
import { PostListingForm } from "./post-listing-form";

export const metadata: Metadata = { title: "Đăng tin" };

export default async function PostListingPage() {
  const user = await requireUser("/dang-tin");
  const [account, categories] = await Promise.all([getMyAccount(), getCategoryTree()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Đăng tin" description="Chọn danh mục và điền thông tin để đăng tin rao vặt." />
      {account?.is_banned ? (
        <BannedNotice reason={account.banned_reason} />
      ) : (
        <PostListingForm userId={user.id} categories={categories} />
      )}
    </div>
  );
}

function BannedNotice({ reason }: { reason: string | null }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4">
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-destructive">Tài khoản đã bị khóa</p>
        {reason && <p>Lý do: {reason}</p>}
        <p className="text-muted-foreground">Bạn không thể đăng tin hoặc nhắn tin trong thời gian này.</p>
      </div>
    </div>
  );
}
