"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export type ToastTone = "success" | "error" | "info";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = { title: string; description?: string; tone?: ToastTone; durationMs?: number };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [
        ...current.slice(-2),
        { id, title: input.title, description: input.description, tone: input.tone ?? "success" },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), input.durationMs ?? DEFAULT_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return ctx;
}


/* A toast is a receipt, not a decoration: one hairline, one tinted edge, no colour wash. */
const toneStyles: Record<ToastTone, { box: string; glyph: string }> = {
  success: { box: "border-signal-line", glyph: "text-signal" },
  error: { box: "border-danger-line", glyph: "text-danger" },
  info: { box: "border-line-strong", glyph: "text-paper-mute" },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(23rem,calc(100vw-2.5rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex animate-fade-up items-start gap-3 border bg-ink-raised px-4 py-3.5 text-[13.5px] shadow-panel",
            toneStyles[toast.tone].box,
          )}
        >
          <ToneGlyph tone={toast.tone} />
          <div className="min-w-0 flex-1">
            <p className="text-paper">{toast.title}</p>
            {toast.description ? (
              <p className="mt-1 text-[12px] leading-snug text-paper-mute">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 shrink-0 p-1 text-paper-faint transition-colors duration-instant hover:text-signal"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function ToneGlyph({ tone }: { tone: ToastTone }) {
  return (
    <svg
      className={cx("mt-0.5 h-4 w-4 shrink-0", toneStyles[tone].glyph)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="15" height="15" stroke="currentColor" strokeWidth="1.5" />
      {tone === "success" ? (
        <path d="m6.5 10 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      ) : (
        <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      )}
    </svg>
  );
}
