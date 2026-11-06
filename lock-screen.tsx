"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Logo, PasswordInput, PrimaryButton } from "@/components/ui";

/**
 * Lock screen: shown on /lock and as a full-screen gate on protected pages
 * when there is no valid session. Nothing else is rendered until authed.
 */
export default function LockScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { authStatus, hasPassword, refreshAuth } = useApp();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // Decide login vs setup once we know whether a password exists.
  useEffect(() => {
    if (authStatus !== "loading") setMode(hasPassword ? "login" : "setup");
  }, [authStatus, hasPassword]);

  // Already authenticated (e.g. stale /lock visit) -> go to library.
  useEffect(() => {
    if (authStatus === "authed") router.replace("/");
  }, [authStatus, router]);

  const fail = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submit = async () => {
    setError("");
    if (mode === "setup") {
      if (password.length < 4) return fail("Mật khẩu phải có ít nhất 4 ký tự.");
      if (password !== confirm) return fail("Mật khẩu xác nhận không khớp.");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) return fail(data.error ?? "Không thể tạo mật khẩu.");
        await refreshAuth();
        router.replace("/");
      } catch {
        fail("Lỗi kết nối máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }
    // login
    if (!password) return fail("Vui lòng nhập mật khẩu.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string; needsSetup?: boolean };
      if (!res.ok) {
        if (data.needsSetup) setMode("setup");
        return fail(data.error ?? "Đăng nhập thất bại.");
      }
      await refreshAuth();
      router.replace("/");
    } catch {
      fail("Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const waiting = authStatus === "loading";

  return (
    <div
      className={`lock-bg flex min-h-screen items-center justify-center p-4 ${
        embedded ? "fixed inset-0 z-[90]" : ""
      }`}
    >
      <div
        className={`animate-pop-in w-full max-w-sm rounded-3xl border border-border bg-surface/90 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Writing Room</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {mode === "setup"
              ? "Tạo mật khẩu để bảo vệ không gian viết của bạn."
              : "Nhập mật khẩu để mở khóa thư viện bài viết."}
          </p>
        </div>

        {waiting ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
            <span className="spinner" /> Đang kiểm tra phiên đăng nhập…
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <PasswordInput
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError("");
              }}
              placeholder={mode === "setup" ? "Mật khẩu mới (tối thiểu 4 ký tự)" : "Mật khẩu"}
              autoFocus
              invalid={Boolean(error)}
              onEnter={() => void submit()}
            />
            {mode === "setup" && (
              <PasswordInput
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  setError("");
                }}
                placeholder="Nhập lại mật khẩu"
                invalid={Boolean(error)}
                onEnter={() => void submit()}
              />
            )}
            {error && <p className="animate-fade-in px-1 text-sm text-danger">{error}</p>}
            <PrimaryButton onClick={() => void submit()} loading={loading} className="mt-1 w-full py-3">
              {mode === "setup" ? "Tạo mật khẩu & vào Writing Room" : "Mở khóa"}
            </PrimaryButton>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("setup");
                  setError("");
                }}
                className="text-center text-xs text-muted underline-offset-2 transition hover:text-accent hover:underline"
              >
                Chưa có mật khẩu? Tạo mới
              </button>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          🔒 Mật khẩu được lưu dưới dạng hash (scrypt) trên máy chủ — không bao giờ lưu dạng văn bản thuần.
        </p>
      </div>
    </div>
  );
}
