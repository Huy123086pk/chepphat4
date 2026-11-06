"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AuthStatus = "loading" | "authed" | "unauthed";
type Theme = "dark" | "light";
type ToastType = "success" | "error" | "info" | "warn";
interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface AppContextValue {
  authStatus: AuthStatus;
  hasPassword: boolean;
  autoLockMinutes: number;
  theme: Theme;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-emerald-500/40 bg-surface text-text",
  error: "border-danger/50 bg-surface text-text",
  info: "border-border bg-surface text-text",
  warn: "border-star/50 bg-surface text-text",
};
const TOAST_DOTS: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error: "bg-danger",
  info: "bg-accent",
  warn: "bg-star",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [hasPassword, setHasPassword] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(10);
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as {
        authenticated?: boolean;
        hasPassword?: boolean;
        autoLockMinutes?: number;
      };
      setHasPassword(Boolean(data.hasPassword));
      setAutoLockMinutes(
        typeof data.autoLockMinutes === "number" ? data.autoLockMinutes : 10,
      );
      setAuthStatus(data.authenticated ? "authed" : "unauthed");
    } catch {
      setAuthStatus("unauthed");
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, [refreshAuth]);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("wr-theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthStatus("unauthed");
      window.location.href = "/lock";
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        authStatus,
        hasPassword,
        autoLockMinutes,
        theme,
        refreshAuth,
        logout,
        toggleTheme,
        toast,
      }}
    >
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${TOAST_STYLES[t.type]}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${TOAST_DOTS[t.type]}`} />
            <span className="leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
