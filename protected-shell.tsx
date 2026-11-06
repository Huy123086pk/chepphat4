"use client";

import type { ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import LockScreen from "@/components/lock-screen";
import { Logo } from "@/components/ui";

/**
 * Gates protected pages: while the session is being checked a splash is shown;
 * when unauthenticated the lock screen replaces the content entirely, so the
 * library / writing room are never rendered without a valid backend session.
 */
export default function ProtectedShell({ children }: { children: ReactNode }) {
  const { authStatus } = useApp();

  if (authStatus === "loading") {
    return (
      <div className="lock-bg flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="animate-pop-in">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <span className="spinner" /> Đang tải Writing Room…
        </div>
      </div>
    );
  }

  if (authStatus === "unauthed") {
    return <LockScreen embedded />;
  }

  return <>{children}</>;
}
