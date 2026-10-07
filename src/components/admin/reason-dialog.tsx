"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionResult } from "@/app/admin/actions";

const REASON_MAX = 500;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  successMessage: string;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<AdminActionResult>;
};

/** Hộp thoại bắt buộc nhập lý do (khóa tài khoản, gỡ tin). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  successMessage,
  placeholder,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (pending) return;
    if (!next) {
      setReason("");
      setError(undefined);
    }
    onOpenChange(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    if (!text) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    startTransition(async () => {
      const result = await onConfirm(text);
      if (result.ok) {
        toast.success(successMessage);
        setReason("");
        setError(undefined);
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-reason">
              Lý do <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="admin-reason"
              rows={4}
              maxLength={REASON_MAX}
              placeholder={placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-reason-error" : undefined}
              autoFocus
            />
            <div className="flex justify-between gap-2 text-xs">
              <span id="admin-reason-error" className="text-destructive">
                {error}
              </span>
              <span className="text-muted-foreground">
                {reason.length}/{REASON_MAX}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
