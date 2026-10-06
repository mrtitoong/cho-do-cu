import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Inbox } from "./inbox";
import { MessagesShell } from "./messages-shell";

export default async function MessagesLayout({ children }: LayoutProps<"/tin-nhan">) {
  const user = await requireUser("/tin-nhan");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_inbox");
  if (error) console.error("get_inbox:", error);

  return (
    <MessagesShell inbox={<Inbox userId={user.id} initialItems={data ?? []} initialError={Boolean(error)} />}>
      {children}
    </MessagesShell>
  );
}
