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

const toneStyles: Record<ToastTone, string> = {
  success: "border-teal-200 bg-white text-teal-900",
  error: "border-red-200 bg-white text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
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
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
            "animate-[fade-up_180ms_ease-out]",
            toneStyles[toast.tone],
          )}
        >
          <ToneGlyph tone={toast.tone} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{toast.title}</p>
            {toast.description ? (
              <p className="mt-0.5 text-xs text-slate-600">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function ToneGlyph({ tone }: { tone: ToastTone }) {
  const color =
    tone === "success" ? "text-teal-600" : tone === "error" ? "text-red-600" : "text-slate-500";
  return (
    <svg className={cx("mt-0.5 h-4 w-4 shrink-0", color)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      {tone === "success" ? (
        <path d="m6.5 10 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
