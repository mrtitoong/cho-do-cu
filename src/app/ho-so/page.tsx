import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser("/ho-so");
  // Cột phone bị ẩn với mọi người → đọc số của chính mình qua hàm get_my_phone
  const supabase = await createClient();
  const { data: phone, error } = await supabase.rpc("get_my_phone");
  if (error) console.error("get_my_phone:", error);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Hồ sơ" description={`Thông tin tài khoản ${user.email ?? ""}`.trim()} />
      <PhoneForm phone={phone ?? null} />
    </div>
  );
}
