"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { GhostButton, Logo, Modal, PrimaryButton } from "@/components/ui";
import { formatDuration, greeting, timeAgo } from "@/lib/format";
import type { DocSummary } from "@/lib/types";

type View = "all" | "favorites" | "drafts" | "trash";
type NavKey = "home" | View | "settings";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-[18px] w-[18px] ${className}`}>
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
  docs: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  star: "m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z",
  pen: "M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM14.5 6.5l3 3",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z",
};

const NAV: { key: NavKey; label: string; icon: string; view?: View }[] = [
  { key: "home", label: "Trang chủ", icon: ICONS.home, view: "all" },
  { key: "all", label: "Tất cả bài viết", icon: ICONS.docs, view: "all" },
  { key: "favorites", label: "Yêu thích", icon: ICONS.star, view: "favorites" },
  { key: "drafts", label: "Bản nháp", icon: ICONS.pen, view: "drafts" },
  { key: "trash", label: "Thùng rác", icon: ICONS.trash, view: "trash" },
];

const VIEW_TITLES: Record<View, string> = {
  all: "Tất cả bài viết",
  favorites: "Bài viết yêu thích",
  drafts: "Bản nháp",
  trash: "Thùng rác",
};

export default function Dashboard() {
  const router = useRouter();
  const { toast, theme, toggleTheme, logout } = useApp();
  const [nav, setNav] = useState<NavKey>("home");
  const [view, setView] = useState<View>("all");
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<DocSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocSummary | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, sort });
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { documents: DocSummary[] };
        setDocs(data.documents);
      } else {
        setDocs([]);
      }
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [view, sort, debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  // close card menu on outside click
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuId]);

  const pickNav = (item: (typeof NAV)[number]) => {
    setNav(item.key);
    if (item.key === "settings") {
      router.push("/settings");
      return;
    }
    if (item.view) setView(item.view);
    if (item.key === "home") setQuery("");
    setSidebarOpen(false);
    setMenuId(null);
  };

  const newDocument = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as DocSummary;
      toast("Đã tạo bài viết mới", "success");
      router.push(`/write/${d.id}`);
    } catch {
      toast("Không thể tạo bài viết. Thử lại sau.", "error");
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (d: DocSummary) => {
    const next = !d.isFavorite;
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, isFavorite: next } : x)));
    try {
      const res = await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error();
      toast(next ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích", "success");
    } catch {
      setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, isFavorite: !next } : x)));
      toast("Không thể cập nhật. Thử lại sau.", "error");
    }
  };

  const openRename = (d: DocSummary) => {
    setMenuId(null);
    setRenameTarget(d);
    setRenameValue(d.title);
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/documents/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() || "Không tiêu đề" }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as DocSummary;
      setDocs((prev) => prev.map((x) => (x.id === updated.id ? { ...x, title: updated.title } : x)));
      toast("Đã đổi tên bài viết", "success");
      setRenameTarget(null);
    } catch {
      toast("Không thể đổi tên. Thử lại sau.", "error");
    } finally {
      setRenameLoading(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/documents/${target.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { trashed?: boolean; deleted?: boolean };
      if (data.deleted) {
        setDocs((prev) => prev.filter((x) => x.id !== target.id));
        toast("Đã xóa vĩnh viễn bài viết", "success");
      } else {
        setDocs((prev) => prev.filter((x) => x.id !== target.id));
        toast("Đã chuyển vào thùng rác", "info");
      }
    } catch {
      toast("Không thể xóa. Thử lại sau.", "error");
    }
  };

  const restoreDoc = async (d: DocSummary) => {
    setMenuId(null);
    try {
      const res = await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrashed: false }),
      });
      if (!res.ok) throw new Error();
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      toast("Đã khôi phục bài viết", "success");
    } catch {
      toast("Không thể khôi phục. Thử lại sau.", "error");
    }
  };

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen">
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-2.5 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Mở menu"
        >
          ☰
        </button>
        <Logo size="sm" />
        <span className="text-sm font-bold">Writing Room</span>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-6 lg:pt-5">
          <Logo size="sm" />
          <div>
            <p className="text-sm font-bold leading-tight">Writing Room</p>
            <p className="text-[11px] text-muted">Không gian viết riêng tư</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {NAV.map((item) => {
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => pickNav(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                  active
                    ? "bg-accent-soft font-semibold text-accent-strong"
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </button>
            );
          })}
          <div className="my-2 border-t border-border" />
          <button
            onClick={() => pickNav({ key: "settings", label: "Cài đặt", icon: ICONS.gear })}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
              nav === "settings"
                ? "bg-accent-soft font-semibold text-accent-strong"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Icon d={ICONS.gear} />
            Cài đặt
          </button>
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <GhostButton onClick={toggleTheme} title="Chuyển giao diện sáng/tối">
            {theme === "dark" ? "☀️ Sáng" : "🌙 Tối"}
          </GhostButton>
          <GhostButton onClick={() => void logout()} title="Khóa ngay (đăng xuất)">
            🔒 Khóa
          </GhostButton>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <header className="animate-fade-up mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">{today}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}</h1>
                <p className="mt-1 text-sm text-muted">
                  {VIEW_TITLES[view]} · {loading ? "đang tải…" : `${docs.length} bài viết`}
                </p>
              </div>
              <PrimaryButton onClick={() => void newDocument()} loading={creating} className="px-5 py-3">
                ＋ Bài viết mới
              </PrimaryButton>
            </header>

            <div className="animate-fade-up mb-6 flex flex-wrap items-center gap-3" style={{ animationDelay: "60ms" }}>
              <div className="relative min-w-56 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">🔍</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tiêu đề hoặc nội dung…"
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
                aria-label="Sắp xếp"
              >
                <option value="updated_desc">Mới chỉnh sửa nhất</option>
                <option value="created_desc">Mới tạo nhất</option>
                <option value="updated_asc">Chỉnh sửa lâu nhất</option>
                <option value="created_asc">Tạo lâu nhất</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface-2/60" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="animate-fade-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 px-6 py-20 text-center">
                <div className="text-5xl">📝</div>
                <h3 className="mt-4 text-lg font-semibold">
                  {view === "trash"
                    ? "Thùng rác trống"
                    : debouncedQuery
                      ? "Không tìm thấy bài viết nào"
                      : view === "drafts"
                        ? "Chưa có bản nháp nào"
                        : view === "favorites"
                          ? "Chưa có bài viết yêu thích"
                          : "Chưa có bài viết nào"}
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted">
                  {view === "all" && !debouncedQuery
                    ? "Nhấn “Bài viết mới” để bắt đầu viết ngay — nội dung được tự động lưu vào máy chủ."
                    : "Thử từ khóa khác hoặc tạo bài viết mới."}
                </p>
                {view === "all" && !debouncedQuery && (
                  <PrimaryButton className="mt-5" onClick={() => void newDocument()} loading={creating}>
                    ＋ Bắt đầu viết
                  </PrimaryButton>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {docs.map((d, i) => (
                  <article
                    key={d.id}
                    onClick={() => router.push(`/write/${d.id}`)}
                    className="group animate-fade-up cursor-pointer rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{d.title}</h3>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleFavorite(d);
                          }}
                          title={d.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                          className={`rounded-lg p-1.5 text-lg leading-none transition hover:bg-surface-2 ${
                            d.isFavorite ? "text-star" : "text-muted hover:text-star"
                          }`}
                        >
                          {d.isFavorite ? "★" : "☆"}
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(menuId === d.id ? null : d.id);
                            }}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
                            aria-label="Tùy chọn"
                          >
                            ⋯
                          </button>
                          {menuId === d.id && (
                            <div
                              className="animate-pop-in absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MenuBtn onClick={() => openRename(d)}>✏️ Đổi tên</MenuBtn>
                              <MenuBtn onClick={() => void toggleFavorite(d)}>
                                {d.isFavorite ? "☆ Bỏ yêu thích" : "★ Yêu thích"}
                              </MenuBtn>
                              {view === "trash" ? (
                                <>
                                  <MenuBtn onClick={() => void restoreDoc(d)}>♻️ Khôi phục</MenuBtn>
                                  <MenuBtn danger onClick={() => { setMenuId(null); setDeleteTarget(d); }}>
                                    🗑 Xóa vĩnh viễn
                                  </MenuBtn>
                                </>
                              ) : (
                                <MenuBtn danger onClick={() => { setMenuId(null); setDeleteTarget(d); }}>
                                  🗑 Chuyển vào thùng rác
                                </MenuBtn>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted">
                      {d.excerpt || "Chưa có nội dung…"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {d.isDraft && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-strong">Nháp</span>
                      )}
                      <span>✏️ {timeAgo(d.updatedAt)}</span>
                      <span>· {d.wordCount.toLocaleString("vi-VN")} từ</span>
                      {d.writingTimeSec > 0 && <span>· ⏱ {formatDuration(d.writingTimeSec)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* rename modal */}
      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Đổi tên bài viết"
      >
        <input
          value={renameValue}
          autoFocus
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void saveRename();
          }}
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Tiêu đề bài viết"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GhostButton onClick={() => setRenameTarget(null)}>Hủy</GhostButton>
          <PrimaryButton onClick={() => void saveRename()} loading={renameLoading}>
            Lưu
          </PrimaryButton>
        </div>
      </Modal>

      {/* delete confirm modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={view === "trash" ? "Xóa vĩnh viễn?" : "Chuyển vào thùng rác?"}
      >
        <p className="text-sm leading-relaxed text-muted">
          {deleteTarget?.title ? `“${deleteTarget.title}”` : "Bài viết này"}{" "}
          {view === "trash"
            ? "sẽ bị xóa vĩnh viễn và không thể khôi phục."
            : "sẽ được chuyển vào thùng rác. Bạn có thể khôi phục sau."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setDeleteTarget(null)}>Hủy</GhostButton>
          <button
            onClick={() => void doDelete()}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-danger/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            {view === "trash" ? "Xóa vĩnh viễn" : "Chuyển vào thùng rác"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MenuBtn({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-surface-2 ${
        danger ? "text-danger" : "text-text"
      }`}
    >
      {children}
    </button>
  );
}
