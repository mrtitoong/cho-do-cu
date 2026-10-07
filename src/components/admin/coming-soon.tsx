import { Construction } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";

/** Trang tạm cho mục menu Admin chưa làm. */
export function ComingSoon({ title, stage }: { title: string; stage: string }) {
  return (
    <div>
      <PageTitle title={title} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
        <Construction className="size-8" />
        <p>Chức năng này sẽ được làm ở giai đoạn {stage}.</p>
      </div>
    </div>
  );
}
