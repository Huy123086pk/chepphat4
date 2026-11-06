"use client";

import { useState, type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spinner inline-block ${className}`} aria-hidden />;
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "lg" ? "h-14 w-14 rounded-2xl text-2xl" : size === "sm" ? "h-8 w-8 rounded-lg text-sm" : "h-10 w-10 rounded-xl text-base";
  return (
    <div
      className={`flex ${dims} shrink-0 select-none items-center justify-center bg-gradient-to-br from-accent-2 to-accent font-bold text-white shadow-lg shadow-accent/25`}
    >
      ✎
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-pop-in w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-2xl border border-border bg-surface p-6 shadow-2xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  onEnter,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        className={`w-full rounded-xl border bg-bg px-4 py-3 pr-12 text-[15px] outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          invalid ? "border-danger" : "border-border"
        }`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-lg text-muted transition hover:text-text"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent-2 to-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  title,
  className = "",
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition ${
        active
          ? "bg-accent-soft text-accent-strong"
          : "text-muted hover:bg-surface-2 hover:text-text"
      } ${className}`}
    >
      {children}
    </button>
  );
}
