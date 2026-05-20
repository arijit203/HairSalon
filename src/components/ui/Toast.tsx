"use client";

import { useToast, type Toast as ToastType } from "@/context/ToastContext";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", icon: "#10b981", bar: "#10b981" },
  error:   { bg: "rgba(244,63,94,0.12)",  border: "rgba(244,63,94,0.25)",  icon: "#f43f5e", bar: "#f43f5e" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", icon: "#f59e0b", bar: "#f59e0b" },
  info:    { bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.25)",  icon: "#06b6d4", bar: "#06b6d4" },
};

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[toast.type];
  const color = COLORS[toast.type];
  const duration = toast.duration ?? 4000;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 250);
  };

  useEffect(() => {
    if (duration > 0) {
      const exitTimer = setTimeout(() => setExiting(true), duration - 300);
      return () => clearTimeout(exitTimer);
    }
  }, [duration]);

  return (
    <div
      className={`toast-item ${exiting ? "toast-exit" : "toast-enter"}`}
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: color.icon }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/[0.08] transition-colors"
      >
        <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
      </button>
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-xl">
          <div
            className="h-full rounded-full"
            style={{
              background: color.bar,
              animation: `toastProgress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9998] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
