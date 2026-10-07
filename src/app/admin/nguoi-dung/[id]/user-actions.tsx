"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, LockOpen, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { banUser, setUserRole, unbanUser } from "@/app/admin/actions";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  userId: string;
  name: string;
  isBanned: boolean;
  role: string;
  /** Đang xem chính mình → không cho khóa / đổi quyền */
  isSelf: boolean;
};

export function UserActions({ userId, name, isBanned, role, isSelf }: Props) {
  const [banOpen, setBanOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);
  // Đổi quyền hỏi xác nhận 2 lần: bước 1 hỏi, bước 2 phải tích "Tôi hiểu"
  const [roleStep, setRoleStep] = useState<0 | 1 | 2>(0);
  const [understood, setUnderstood] = useState(false);
  const [pending, startTransition] = useTransition();
  const makeAdmin = role !== "admin";

  if (isSelf) {
    return (
      <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
        Đây là tài khoản của bạn. Admin không thể tự khóa hoặc tự thu quyền của mình.
      </p>
    );
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string, done: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        done();
      } else {
        toast.error(result.error);
      }
    });
  }

  function resetRole() {
    setRoleStep(0);
    setUnderstood(false);
  }

  function closeRole() {
    if (!pending) resetRole();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isBanned ? (
        <Button variant="outline" onClick={() => setUnbanOpen(true)}>
          <LockOpen /> Mở khóa
        </Button>
      ) : (
        <Button variant="destructive" onClick={() => setBanOpen(true)}>
          <Ban /> Khóa tài khoản
        </Button>
      )}
      <Button variant="outline" onClick={() => setRoleStep(1)}>
        {makeAdmin ? <ShieldCheck /> : <ShieldOff />}
        {makeAdmin ? "Cấp quyền admin" : "Thu quyền admin"}
      </Button>

      <ReasonDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        title={`Khóa tài khoản ${name}?`}
        description="Người này sẽ không đăng tin và không nhắn tin được; mọi tin đang bán của họ tự chuyển sang ẩn."
        placeholder="VD: Đăng tin lừa đảo nhiều lần"
        confirmLabel="Khóa tài khoản"
        successMessage="Đã khóa tài khoản"
        onConfirm={(reason) => banUser(userId, reason)}
      />

      <AlertDialog open={unbanOpen} onOpenChange={(open) => !pending && setUnbanOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mở khóa tài khoản {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Người này đăng tin và nhắn tin lại được. Các tin đã bị ẩn khi khóa không tự hiện lại; họ tự bật lại
              trong &quot;Tin của tôi&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <Button
              disabled={pending}
              onClick={() => run(() => unbanUser(userId), "Đã mở khóa tài khoản", () => setUnbanOpen(false))}
            >
              {pending && <Loader2 className="animate-spin" />} Mở khóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={roleStep > 0} onOpenChange={(open) => !open && closeRole()}>
        <AlertDialogContent>
          {roleStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {makeAdmin ? `Cấp quyền admin cho ${name}?` : `Thu quyền admin của ${name}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {makeAdmin
                    ? "Admin xem được email, số điện thoại của mọi người dùng, khóa tài khoản, gỡ tin và sửa danh mục."
                    : "Người này sẽ không vào được khu vực quản trị nữa."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <Button onClick={() => setRoleStep(2)}>Tiếp tục</Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận lần cuối</AlertDialogTitle>
                <AlertDialogDescription>
                  {makeAdmin ? "Cấp" : "Thu"} quyền admin {makeAdmin ? "cho" : "của"} <strong>{name}</strong>. Thao tác
                  này được ghi vào nhật ký quản trị.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-3">
                <Checkbox id="role-confirm" checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} />
                <Label htmlFor="role-confirm" className="font-normal">
                  Tôi hiểu và muốn {makeAdmin ? "cấp" : "thu"} quyền admin
                </Label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
                <Button
                  variant={makeAdmin ? "default" : "destructive"}
                  disabled={!understood || pending}
                  onClick={() =>
                    run(
                      () => setUserRole(userId, makeAdmin ? "admin" : "user"),
                      makeAdmin ? "Đã cấp quyền admin" : "Đã thu quyền admin",
                      resetRole,
                    )
                  }
                >
                  {pending && <Loader2 className="animate-spin" />}
                  {makeAdmin ? "Cấp quyền" : "Thu quyền"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
