"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { GhostButton, Logo, PasswordInput, PrimaryButton } from "@/components/ui";
import {
  DEFAULT_EDITOR_SETTINGS,
  EDITOR_STORAGE_KEY,
  FONT_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  SIZE_OPTIONS,
  type EditorSettings,
} from "@/lib/types";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast, theme, toggleTheme, autoLockMinutes, refreshAuth, logout } = useApp();

  // change password
  const [current, setCurrent] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  // auto lock
  const [autoLock, setAutoLock] = useState(String(autoLockMinutes));
  const [lockLoading, setLockLoading] = useState(false);

  // editor defaults
  const [editor, setEditor] = useState<EditorSettings>(() => {
    try {
      const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
      return raw
        ? { ...DEFAULT_EDITOR_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) }
        : DEFAULT_EDITOR_SETTINGS;
    } catch {
      return DEFAULT_EDITOR_SETTINGS;
    }
  });

  const [restoreLoading, setRestoreLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const changePassword = async () => {
    setPwError("");
    if (nextPw.length < 4) return setPwError("Mật khẩu mới phải có ít nhất 4 ký tự.");
    if (nextPw !== confirmPw) return setPwError("Mật khẩu xác nhận không khớp.");
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: nextPw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPwError(data.error ?? "Không thể đổi mật khẩu.");
        return;
      }
      setCurrent("");
      setNextPw("");
      setConfirmPw("");
      toast("Đã đổi mật khẩu thành công", "success");
    } catch {
      setPwError("Lỗi kết nối máy chủ.");
    } finally {
      setPwLoading(false);
    }
  };

  const saveAutoLock = async () => {
    const minutes = Math.max(0, Math.min(24 * 60, parseInt(autoLock, 10) || 0));
    setAutoLock(String(minutes));
    setLockLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoLockMinutes: minutes }),
      });
      if (!res.ok) throw new Error();
      await refreshAuth();
      toast(minutes === 0 ? "Đã tắt tự động khóa" : `Tự động khóa sau ${minutes} phút không hoạt động`, "success");
    } catch {
      toast("Không thể lưu cài đặt. Thử lại sau.", "error");
    } finally {
      setLockLoading(false);
    }
  };

  const updateEditor = (patch: Partial<EditorSettings>) => {
    setEditor((prev) => {
      const merged = { ...prev, ...patch };
      try {
        localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      toast("Đã lưu cài đặt soạn thảo", "success");
      return merged;
    });
  };

  const exportBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `writing-room-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Đã tải bản sao lưu", "success");
    } catch {
      toast("Không thể tạo bản sao lưu. Thử lại sau.", "error");
    }
  };

  const restoreBackup = async (file: File) => {
    setRestoreLoading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as { error?: string; imported?: number };
      if (!res.ok) throw new Error(data.error ?? "Khôi phục thất bại");
      toast(`Đã khôi phục ${data.imported ?? 0} bài viết`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "File sao lưu không hợp lệ.", "error");
    } finally {
      setRestoreLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
        >
          ← <span className="hidden sm:inline">Thư viện</span>
        </button>
        <Logo size="sm" />
        <h1 className="text-base font-bold">Cài đặt</h1>
        <div className="ml-auto">
          <GhostButton onClick={toggleTheme}>{theme === "dark" ? "☀️ Sáng" : "🌙 Tối"}</GhostButton>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <Section title="🔐 Mật khẩu" desc="Đổi mật khẩu đăng nhập Writing Room. Mật khẩu được lưu dạng hash (scrypt) trên máy chủ.">
          <div className="flex flex-col gap-3">
            <PasswordInput
              value={current}
              onChange={setCurrent}
              placeholder="Mật khẩu hiện tại"
              invalid={Boolean(pwError)}
            />
            <PasswordInput value={nextPw} onChange={setNextPw} placeholder="Mật khẩu mới (tối thiểu 4 ký tự)" />
            <PasswordInput
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Nhập lại mật khẩu mới"
              invalid={Boolean(pwError)}
            />
            {pwError && <p className="animate-fade-in px-1 text-sm text-danger">{pwError}</p>}
            <div>
              <PrimaryButton onClick={() => void changePassword()} loading={pwLoading}>
                Đổi mật khẩu
              </PrimaryButton>
            </div>
          </div>
        </Section>

        <Section
          title="⏲ Tự động khóa"
          desc="Tự động khóa phòng viết sau một khoảng thời gian không hoạt động (0 = tắt)."
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={1440}
              value={autoLock}
              onChange={(e) => setAutoLock(e.target.value)}
              className="w-28 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <span className="text-sm text-muted">phút không hoạt động</span>
            <PrimaryButton onClick={() => void saveAutoLock()} loading={lockLoading} className="ml-auto">
              Lưu
            </PrimaryButton>
          </div>
        </Section>

        <Section title="🎨 Giao diện" desc="Chọn chế độ sáng hoặc tối. Lựa chọn được lưu trên thiết bị này.">
          <div className="flex gap-3">
            <button
              onClick={() => theme !== "light" && toggleTheme()}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                theme === "light"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              ☀️ Sáng
            </button>
            <button
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                theme === "dark"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              🌙 Tối
            </button>
          </div>
        </Section>

        <Section title="✍️ Soạn thảo mặc định" desc="Font, cỡ chữ và khoảng cách dòng mặc định cho phòng viết.">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={editor.font}
              onChange={(e) => updateEditor({ font: e.target.value })}
              className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={editor.size}
              onChange={(e) => updateEditor({ size: Number(e.target.value) })}
              className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
            <select
              value={editor.lineHeight}
              onChange={(e) => updateEditor({ lineHeight: Number(e.target.value) })}
              className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {LINE_HEIGHT_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  Dòng {l.toFixed(1)}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section
          title="💾 Sao lưu & khôi phục"
          desc="Tải toàn bộ bài viết về máy dạng JSON, hoặc khôi phục từ một bản sao lưu trước đó. Dữ liệu luôn được lưu trong PostgreSQL của máy chủ."
        >
          <div className="flex flex-wrap gap-3">
            <PrimaryButton onClick={() => void exportBackup()}>⬇ Tải bản sao lưu (.json)</PrimaryButton>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={restoreLoading}
              className="rounded-xl border border-border bg-bg px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-2 active:scale-[0.98] disabled:opacity-60"
            >
              {restoreLoading ? "Đang khôi phục…" : "⬆ Khôi phục từ bản sao lưu"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restoreBackup(f);
              }}
            />
          </div>
        </Section>

        <Section title="🚪 Phiên làm việc" desc="Khóa ngay lập tức — cần nhập mật khẩu để mở lại.">
          <GhostButton onClick={() => void logout()}>🔒 Khóa Writing Room ngay</GhostButton>
        </Section>
      </main>
    </div>
  );
}
