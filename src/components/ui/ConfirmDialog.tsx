"use client";

import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  loading = false,
  variant = "danger",
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  const accentColor = isDanger ? "#f43f5e" : "#f59e0b";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
            style={{
              background: isDanger
                ? "linear-gradient(135deg, #f43f5e, #dc2626)"
                : "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: `0 4px 16px ${accentColor}50`,
              opacity: loading ? 0.7 : 1,
              border: "none",
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && (
              <div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              />
            )}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: accentColor }} />
        </div>
        <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
