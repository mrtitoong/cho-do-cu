import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

/** Khung một ô nhập: nhãn, ô nhập, dòng gợi ý và thông báo lỗi. */
export function FormField({ id, label, required, error, hint, children }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Ô nhập có đơn vị (m², km...) hiển thị ở mép phải. */
export function WithUnit({ unit, children }: { unit?: string; children: React.ReactNode }) {
  if (!unit) return children;
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
