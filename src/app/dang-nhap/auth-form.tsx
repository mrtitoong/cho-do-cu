"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "login" | "register" | "forgot";
type Notice = { type: "error" | "success"; text: string } | null;

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email hoặc mật khẩu không đúng.",
  "Email not confirmed": "Email chưa được xác nhận. Vui lòng mở hộp thư và bấm vào link xác nhận.",
  "User already registered": "Email này đã được đăng ký. Hãy đăng nhập.",
  "Password should be at least 6 characters.": "Mật khẩu phải có ít nhất 6 ký tự.",
  "Unable to validate email address: invalid format": "Email không hợp lệ.",
};

function translateError(message: string) {
  if (ERROR_MESSAGES[message]) return ERROR_MESSAGES[message];
  if (/rate limit|security purposes/i.test(message)) {
    return "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.";
  }
  return `Có lỗi xảy ra: ${message}`;
}

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}

export function AuthForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(
    initialError ? { type: "error", text: initialError } : null,
  );

  function switchMode(m: Mode) {
    setMode(m);
    setNotice(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setNotice({ type: "error", text: translateError(error.message) });
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: callbackUrl(next),
      },
    });
    setLoading(false);
    if (error) {
      setNotice({ type: "error", text: translateError(error.message) });
      return;
    }
    if (data.session) {
      // Dự án tắt xác nhận email: đăng nhập luôn.
      router.replace(next);
      router.refresh();
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      setNotice({ type: "error", text: ERROR_MESSAGES["User already registered"] });
      return;
    }
    setNotice({
      type: "success",
      text: `Đã gửi email xác nhận đến ${email}. Mở hộp thư và bấm vào link để hoàn tất đăng ký.`,
    });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/dat-lai-mat-khau"),
    });
    setLoading(false);
    if (error) {
      setNotice({ type: "error", text: translateError(error.message) });
      return;
    }
    setNotice({
      type: "success",
      text: `Nếu ${email} đã đăng ký, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.`,
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setNotice(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) {
      setNotice({ type: "error", text: translateError(error.message) });
      setLoading(false);
    }
  }

  const noticeBox = notice && (
    <p
      role={notice.type === "error" ? "alert" : "status"}
      className={
        notice.type === "error"
          ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          : "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      }
    >
      {notice.text}
    </p>
  );

  const submitButton = (label: string) => (
    <Button type="submit" className="h-11 w-full" disabled={loading}>
      {loading && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  );

  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11"
        placeholder="ban@vidu.com"
      />
    </div>
  );

  if (mode === "forgot") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgot} className="space-y-4">
            {emailField}
            {noticeBox}
            {submitButton("Gửi link đặt lại mật khẩu")}
            <Button type="button" variant="link" className="w-full" onClick={() => switchMode("login")}>
              Quay lại đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Chào mừng đến Chợ Đồ Cũ</CardTitle>
        <CardDescription>Đăng nhập để đăng tin, nhắn tin và xem số điện thoại người bán.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" className="h-11 w-full" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon /> Tiếp tục với Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" /> hoặc dùng email <Separator className="flex-1" />
        </div>

        <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="register">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              {emailField}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => switchMode("forgot")}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              {noticeBox}
              {submitButton("Đăng nhập")}
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên</Label>
                <Input
                  id="full_name"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
              {emailField}
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>
              {noticeBox}
              {submitButton("Tạo tài khoản")}
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
