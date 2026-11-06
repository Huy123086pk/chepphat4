"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { GhostButton, Logo, Modal, PasswordInput, PrimaryButton } from "@/components/ui";
import { formatClock } from "@/lib/format";
import {
  DEFAULT_EDITOR_SETTINGS,
  EDITOR_STORAGE_KEY,
  FONT_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  SIZE_OPTIONS,
  type Doc,
  type EditorSettings,
} from "@/lib/types";

type SaveStatus = "saved" | "saving" | "error";

function Icon({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
const P = {
  bold: "M7 4h6a3.5 3.5 0 0 1 0 7H7zM7 11h7a3.5 3.5 0 0 1 0 7H7zM7 4v14",
  italic: "M10 4h8M6 20h8M14 4l-4 16",
  underline: "M7 4v6a5 5 0 0 0 10 0V4M5 20h14",
  left: "M4 6h16M4 12h10M4 18h16",
  center: "M4 6h16M7 12h10M4 18h16",
  right: "M4 6h16M10 12h10M4 18h16",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2",
  redo: "m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h2",
  focus: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  sound: "M4 10v4h3l5 4V6l-5 4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  check: "M4 12l5 5L20 7",
};

function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

function setCaretOffset(el: HTMLElement, offset: number): void {
  const sel = window.getSelection();
  if (!sel) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode() as Text | null;
  let last: Text | null = null;
  while (node) {
    last = node;
    if (node.length >= remaining) {
      const r = document.createRange();
      r.setStart(node, remaining);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    remaining -= node.length;
    node = walker.nextNode() as Text | null;
  }
  if (last) {
    const r = document.createRange();
    r.setStart(last, last.length);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

const caretKey = (id: string) => `wr-caret-${id}`;

export default function WritingRoom({ docId }: { docId?: string }) {
  const router = useRouter();
  const { toast, autoLockMinutes, logout } = useApp();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [focusMode, setFocusMode] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [counts, setCounts] = useState({ words: 0, chars: 0, lines: 0 });
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false });
  const [editor, setEditor] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [showExit, setShowExit] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitError, setExitError] = useState("");
  const [exitLoading, setExitLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<Doc | null>(null);
  const titleRef = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const initRef = useRef(false);
  const createdRef = useRef(false);
  const baseWritingRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const audioRef = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  /* ---------- load (or create) the document ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (docId) {
          const res = await fetch(`/api/documents/${docId}`, { cache: "no-store" });
          if (!res.ok) throw new Error("not found");
          const d = (await res.json()) as Doc;
          if (cancelled) return;
          setDoc(d);
          docRef.current = d;
        } else {
          if (createdRef.current) return;
          createdRef.current = true;
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (!res.ok) throw new Error("create failed");
          const d = (await res.json()) as Doc;
          if (cancelled) return;
          setDoc(d);
          docRef.current = d;
          router.replace(`/write/${d.id}`);
        }
      } catch {
        if (!cancelled) setLoadError("Không thể tải bài viết. Vui lòng quay lại thư viện và thử lại.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, router]);

  /* ---------- initialize editor content + settings once doc is ready ---------- */
  useEffect(() => {
    if (!doc || initRef.current) return;
    initRef.current = true;
    baseWritingRef.current = doc.writingTimeSec;
    setTitle(doc.title);
    titleRef.current = doc.title;
    const el = editorRef.current;
    if (el) {
      el.innerHTML = doc.content || "";
      try {
        const raw = localStorage.getItem(caretKey(doc.id));
        if (raw) setTimeout(() => setCaretOffset(el, parseInt(raw, 10) || 0), 30);
      } catch {
        /* ignore */
      }
      updateCounts();
    }
    try {
      const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EditorSettings>;
        setEditor({ ...DEFAULT_EDITOR_SETTINGS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const updateCounts = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = (el.innerText ?? "").replace(/\u00a0/g, " ");
    const trimmed = text.trim();
    setCounts({
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: text.replace(/\n$/, "").length,
      lines: trimmed ? text.split("\n").length : 0,
    });
  }, []);

  const refreshFormatState = useCallback(() => {
    try {
      setFmt({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------- saving ---------- */
  const save = useCallback(async () => {
    const d = docRef.current;
    const el = editorRef.current;
    if (!d || !el) return;
    setStatus("saving");
    try {
      const html = el.innerHTML;
      const plain = (el.innerText ?? "").replace(/\u00a0/g, " ");
      const trimmed = plain.trim();
      const res = await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleRef.current.trim() || "Không tiêu đề",
          content: html,
          plainText: plain.slice(0, 200_000),
          wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
          charCount: plain.replace(/\n$/, "").length,
          lineCount: trimmed ? plain.split("\n").length : 0,
          writingTimeSec: baseWritingRef.current + elapsedRef.current,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = (await res.json()) as Doc;
      docRef.current = updated;
      setDoc(updated);
      dirtyRef.current = false;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setStatus("saving");
    lastActivityRef.current = Date.now();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), 900);
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    // keep :empty placeholder working
    if (el.innerText?.trim() === "" && el.innerHTML !== "") el.innerHTML = "";
    updateCounts();
    refreshFormatState();
    try {
      const d = docRef.current;
      if (d) localStorage.setItem(caretKey(d.id), String(getCaretOffset(el)));
    } catch {
      /* ignore */
    }
    scheduleSave();
  }, [updateCounts, refreshFormatState, scheduleSave]);

  /* ---------- writing timer ---------- */
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* ---------- activity tracking + auto lock ---------- */
  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, bumpActivity, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, bumpActivity));
  }, [bumpActivity]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!autoLockMinutes || autoLockMinutes <= 0) return;
      if (Date.now() - lastActivityRef.current > autoLockMinutes * 60_000) {
        void (async () => {
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } finally {
            window.location.href = "/lock";
          }
        })();
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [autoLockMinutes]);

  /* ---------- navigation guards: beforeunload + back button ---------- */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const d = docRef.current;
      const el = editorRef.current;
      if (d && el && dirtyRef.current) {
        try {
          navigator.sendBeacon(
            `/api/documents/${d.id}`,
            new Blob(
              [
                JSON.stringify({
                  title: titleRef.current.trim() || "Không tiêu đề",
                  content: el.innerHTML,
                  writingTimeSec: baseWritingRef.current + elapsedRef.current,
                }),
              ],
              { type: "application/json" },
            ),
          );
        } catch {
          /* ignore */
        }
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    const onPop = () => {
      window.history.pushState(null, "", window.location.href);
      setShowExit(true);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  /* ---------- ambient sound (WebAudio brown noise) ---------- */
  const toggleAmbient = useCallback(() => {
    const existing = audioRef.current;
    if (existing) {
      const { ctx, gain } = existing;
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      } catch {
        /* ignore */
      }
      setTimeout(() => void ctx.close().catch(() => {}), 500);
      audioRef.current = null;
      setAmbient(false);
      return;
    }
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const len = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 0.4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 1.2);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      audioRef.current = { ctx, gain };
      setAmbient(true);
    } catch {
      toast("Trình duyệt không hỗ trợ âm thanh nền", "warn");
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) void a.ctx.close().catch(() => {});
    };
  }, []);

  /* ---------- editor commands ---------- */
  const exec = useCallback(
    (cmd: string, value?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(cmd, false, value);
      updateCounts();
      refreshFormatState();
      scheduleSave();
    },
    [updateCounts, refreshFormatState, scheduleSave],
  );

  const blockClipboardKeys = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "v"].includes(k)) {
      e.preventDefault();
      toast("Không thể sao chép / cắt / dán trong phòng viết", "warn");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === "s") {
      e.preventDefault();
      void saveRef.current().then(() => toast("Đã lưu bài viết", "success"));
    }
  };

  const updateEditor = (next: Partial<EditorSettings>) => {
    setEditor((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  };

  /* ---------- exit / lock ---------- */
  const confirmExit = async () => {
    setExitError("");
    setExitLoading(true);
    try {
      await saveRef.current();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exitPassword }),
      });
      if (!res.ok) {
        setExitError("Sai mật khẩu. Không thể thoát phòng viết.");
        return;
      }
      setShowExit(false);
      router.push("/");
    } catch {
      setExitError("Lỗi kết nối máy chủ.");
    } finally {
      setExitLoading(false);
    }
  };

  const toggleComplete = async () => {
    const d = docRef.current;
    if (!d) return;
    const next = !d.isDraft;
    try {
      const res = await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDraft: next }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as Doc;
      docRef.current = updated;
      setDoc(updated);
      toast(next ? "Đã lưu thành bài viết hoàn chỉnh" : "Đã chuyển về bản nháp", "success");
    } catch {
      toast("Không thể cập nhật. Thử lại sau.", "error");
    }
  };

  const saveStatusNode = (
    <span className="flex items-center gap-1.5 text-xs">
      {status === "saving" && (
        <>
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-star" />
          <span className="text-muted">Đang lưu…</span>
        </>
      )}
      {status === "saved" && <span className="font-medium text-emerald-500">✓ Đã lưu</span>}
      {status === "error" && <span className="font-medium text-danger">⚠ Lỗi khi lưu</span>}
    </span>
  );

  const editorEl = (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder="Bắt đầu viết… (chỉ có thể nhập trực tiếp bằng bàn phím — không hỗ trợ dán)"
      className="wr-editor w-full"
      style={{
        fontFamily: editor.font,
        fontSize: `${editor.size}px`,
        lineHeight: editor.lineHeight,
      }}
      onInput={handleInput}
      onKeyDown={blockClipboardKeys}
      onKeyUp={refreshFormatState}
      onMouseUp={refreshFormatState}
      onPaste={(e) => {
        e.preventDefault();
        toast("Không thể dán nội dung trong phòng viết", "warn");
      }}
      onCopy={(e) => {
        e.preventDefault();
        toast("Không thể sao chép trong phòng viết", "warn");
      }}
      onCut={(e) => {
        e.preventDefault();
        toast("Không thể cắt trong phòng viết", "warn");
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        toast("Không thể kéo thả văn bản vào phòng viết", "warn");
      }}
      onBeforeInput={(e) => {
        if (e.nativeEvent.inputType?.toLowerCase().includes("paste")) e.preventDefault();
      }}
    />
  );

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">😕</div>
        <p className="max-w-sm text-sm text-muted">{loadError}</p>
        <PrimaryButton onClick={() => router.push("/")}>← Về thư viện</PrimaryButton>
      </div>
    );
  }

  /* ---------- FOCUS MODE ---------- */
  if (focusMode) {
    return (
      <div className="animate-room-open flex min-h-screen flex-col bg-bg">
        <div className="flex-1 overflow-y-auto px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl">{editorEl}</div>
        </div>
        <div className="animate-fade-up fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-3 shadow-2xl backdrop-blur">
          <span className="font-mono text-lg font-semibold tabular-nums text-accent-strong">
            {formatClock(elapsed)}
          </span>
          <span className="h-5 w-px bg-border" />
          {saveStatusNode}
          <span className="h-5 w-px bg-border" />
          <GhostButton onClick={toggleAmbient} active={ambient} title="Âm thanh nền (mưa nhẹ)">
            <Icon d={P.sound} /> {ambient ? "Tắt" : "Nhạc"}
          </GhostButton>
          <GhostButton onClick={() => setFocusMode(false)} title="Thoát chế độ tập trung">
            <Icon d={P.focus} /> Thoát
          </GhostButton>
          <GhostButton
            onClick={() => {
              void saveRef.current().then(() => setShowExit(true));
            }}
            title="Rời phòng viết (cần mật khẩu)"
          >
            ← Thư viện
          </GhostButton>
          <GhostButton onClick={() => void logout()} title="Khóa ngay">
            <Icon d={P.lock} />
          </GhostButton>
        </div>
        <ExitModal
          open={showExit}
          password={exitPassword}
          setPassword={setExitPassword}
          error={exitError}
          loading={exitLoading}
          onClose={() => {
            setShowExit(false);
            setExitPassword("");
            setExitError("");
          }}
          onConfirm={() => void confirmExit()}
        />
      </div>
    );
  }

  /* ---------- NORMAL MODE ---------- */
  return (
    <div className="animate-room-open flex min-h-screen flex-col bg-bg">
      {/* top bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
        <button
          onClick={() => void saveRef.current().then(() => setShowExit(true))}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
          title="Rời phòng viết (cần xác thực mật khẩu)"
        >
          ← <span className="hidden sm:inline">Thư viện</span>
        </button>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            scheduleSave();
          }}
          placeholder="Không tiêu đề"
          className="min-w-32 flex-1 rounded-lg bg-transparent px-2 py-2 text-lg font-bold outline-none transition placeholder:font-normal placeholder:text-muted focus:bg-surface-2"
        />
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="hidden text-xs text-muted md:inline">
            {counts.words.toLocaleString("vi-VN")} từ · {counts.chars.toLocaleString("vi-VN")} ký tự · {counts.lines} dòng
          </span>
          {saveStatusNode}
          <GhostButton
            onClick={() => void saveRef.current().then(() => toast("Đã lưu bài viết", "success"))}
            title="Lưu ngay (Ctrl+S)"
          >
            <Icon d={P.save} /> <span className="hidden sm:inline">Lưu</span>
          </GhostButton>
          <GhostButton
            onClick={() => void toggleComplete()}
            title={doc?.isDraft ? "Đánh dấu hoàn thành (lưu chính thức)" : "Chuyển lại thành bản nháp"}
            active={!doc?.isDraft}
          >
            <Icon d={P.check} /> <span className="hidden sm:inline">{doc?.isDraft ? "Hoàn thành" : "Đã xong"}</span>
          </GhostButton>
          <GhostButton onClick={toggleAmbient} active={ambient} title="Âm thanh nền (mưa nhẹ)">
            <Icon d={P.sound} />
          </GhostButton>
          <GhostButton onClick={() => setFocusMode(true)} title="Chế độ tập trung">
            <Icon d={P.focus} />
          </GhostButton>
          <GhostButton onClick={() => void logout()} title="Khóa phòng viết ngay (đăng xuất)">
            <Icon d={P.lock} />
          </GhostButton>
        </div>
      </header>

      {/* toolbar */}
      <div className="sticky top-[57px] z-20 flex flex-wrap items-center gap-1 border-b border-border bg-surface/90 px-3 py-2 backdrop-blur sm:px-6">
        <TBtn onClick={() => exec("undo")} title="Hoàn tác (Ctrl+Z)">
          <Icon d={P.undo} />
        </TBtn>
        <TBtn onClick={() => exec("redo")} title="Làm lại (Ctrl+Y)">
          <Icon d={P.redo} />
        </TBtn>
        <Sep />
        <TBtn active={fmt.bold} onClick={() => exec("bold")} title="In đậm (Ctrl+B)">
          <span className="w-6 text-center font-bold">B</span>
        </TBtn>
        <TBtn active={fmt.italic} onClick={() => exec("italic")} title="In nghiêng (Ctrl+I)">
          <span className="w-6 text-center italic">I</span>
        </TBtn>
        <TBtn active={fmt.underline} onClick={() => exec("underline")} title="Gạch chân (Ctrl+U)">
          <span className="w-6 text-center underline">U</span>
        </TBtn>
        <Sep />
        <TBtn onClick={() => exec("justifyLeft")} title="Căn trái">
          <Icon d={P.left} />
        </TBtn>
        <TBtn onClick={() => exec("justifyCenter")} title="Căn giữa">
          <Icon d={P.center} />
        </TBtn>
        <TBtn onClick={() => exec("justifyRight")} title="Căn phải">
          <Icon d={P.right} />
        </TBtn>
        <Sep />
        <select
          value={editor.font}
          onChange={(e) => updateEditor({ font: e.target.value })}
          className="max-w-36 cursor-pointer rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none transition hover:bg-surface-2 focus:border-border"
          title="Font chữ"
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
          className="w-20 cursor-pointer rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none transition hover:bg-surface-2 focus:border-border"
          title="Cỡ chữ"
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
          className="w-20 cursor-pointer rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none transition hover:bg-surface-2 focus:border-border"
          title="Khoảng cách dòng"
        >
          {LINE_HEIGHT_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l.toFixed(1)}
            </option>
          ))}
        </select>
        <div className="ml-auto hidden items-center gap-2 text-xs text-muted md:flex">
          <span>⏱ {formatClock(elapsed)}</span>
          <span className="text-border">|</span>
          <span>
            {counts.words.toLocaleString("vi-VN")} từ · {counts.chars.toLocaleString("vi-VN")} ký tự · {counts.lines} dòng
          </span>
        </div>
      </div>

      {/* editor area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
        {!doc ? (
          <div className="flex items-center justify-center gap-3 pt-24 text-sm text-muted">
            <span className="spinner" /> Đang mở phòng viết…
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center gap-2 text-xs text-muted">
              <Logo size="sm" />
              <span>
                Writing Room · {doc.isDraft ? "Bản nháp" : "Bài viết hoàn chỉnh"} · tự động lưu vào máy chủ
              </span>
            </div>
            {editorEl}
          </div>
        )}
      </main>

      <ExitModal
        open={showExit}
        password={exitPassword}
        setPassword={setExitPassword}
        error={exitError}
        loading={exitLoading}
        onClose={() => {
          setShowExit(false);
          setExitPassword("");
          setExitError("");
        }}
        onConfirm={() => void confirmExit()}
      />
    </div>
  );
}

function TBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm transition ${
        active ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}

function ExitModal({
  open,
  password,
  setPassword,
  error,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Xác thực để rời phòng viết">
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Nhập mật khẩu để xác nhận thoát khỏi phòng viết và quay về thư viện. Phiên viết sẽ được lưu trước khi thoát.
      </p>
      <PasswordInput
        value={password}
        onChange={(v) => setPassword(v)}
        placeholder="Mật khẩu"
        autoFocus
        invalid={Boolean(error)}
        onEnter={onConfirm}
      />
      {error && <p className="animate-fade-in mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton onClick={onClose}>Tiếp tục viết</GhostButton>
        <PrimaryButton onClick={onConfirm} loading={loading}>
          Xác nhận & thoát
        </PrimaryButton>
      </div>
    </Modal>
  );
}
