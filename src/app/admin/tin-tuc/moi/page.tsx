import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "Viết bài mới" };

export default async function NewPostPage() {
  await requireAdminPage("/admin/tin-tuc/moi");
  return <PostEditor post={null} />;
}
