"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Scissors, Clock, Tag, Check, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface ServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingService?: any;
}

const CATEGORIES = ["Hair", "Skin & Facial", "Nails", "Body & Wax", "Packages"];

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1h 15m", value: 75 },
  { label: "1h 30m", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "2h 30m", value: 150 },
  { label: "3 hours", value: 180 },
  { label: "4 hours", value: 240 },
  { label: "5 hours", value: 300 },
];

export default function ServiceModal({ open, onClose, onSaved, editingService }: ServiceModalProps) {
  const { success, error: toastError } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Hair");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [isPopular, setIsPopular] = useState(false);
  
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load staff list
  useEffect(() => {
    if (!open) return;
    setStaffLoading(true);
    fetch("/api/staff?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setStaffList(d.data);
        }
      })
      .catch((err) => console.error("Error loading staff:", err))
      .finally(() => setStaffLoading(false));
  }, [open]);

  // Load editing service data if provided
  useEffect(() => {
    if (open && editingService) {
      setName(editingService.name || "");
      setDescription(editingService.description || "");
      setCategory(editingService.category || "Hair");
      setPrice(editingService.price ? String(editingService.price) : "");
      setDiscountPrice(editingService.discountPrice ? String(editingService.discountPrice) : "");
      setDuration(editingService.duration ? String(editingService.duration) : "60");
      setIsPopular(editingService.isPopular || false);
      
      const assignedIds = editingService.staffServices?.map((ss: any) => ss.staffId) || [];
      setSelectedStaffIds(assignedIds);
    } else if (open) {
      setName("");
      setDescription("");
      setCategory("Hair");
      setPrice("");
      setDiscountPrice("");
      setDuration("60");
      setIsPopular(false);
      setSelectedStaffIds([]);
    }
  }, [open, editingService]);

  const handleToggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toastError("Service name is required");
    if (!price || parseFloat(price) <= 0) return toastError("Price must be a positive number");
    if (discountPrice && parseFloat(discountPrice) >= parseFloat(price)) {
      return toastError("Discount price must be less than regular price");
    }
    if (discountPrice && parseFloat(discountPrice) <= 0) {
      return toastError("Discount price must be a positive number");
    }

    setSubmitting(true);
    try {
      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        duration: parseInt(duration, 10),
        isPopular,
        staffIds: selectedStaffIds,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save service");
      }

      success(editingService ? "Service updated successfully!" : "Service created successfully!");
      onSaved();
      onClose();
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while saving the service.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div
            className="relative w-full max-w-lg flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              maxHeight: "90vh",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}>
                  {editingService ? "Edit Service" : "Add New Service"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="btn-icon w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Keratin Treatment"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={submitting}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Duration *
                  </label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={submitting}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              </div>

              {/* Price & Discount Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Price (₹) *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    <input
                      type="number"
                      step="any"
                      placeholder="800"
                      className="input-field pl-9"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Discount Price (₹) <span className="text-[10px] opacity-60">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 699"
                      className="input-field pl-9"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the service details, products used, or who it is best for..."
                  className="input-field resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Popular Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer hover:bg-white/[0.02] border border-white/[0.04] transition-all">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="rounded border-white/[0.1] bg-white/[0.05] text-rose-500 focus:ring-rose-500 focus:ring-offset-[var(--bg-secondary)]"
                  disabled={submitting}
                />
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Feature this service
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Mark as a popular choice to display a featured badge.
                  </p>
                </div>
              </label>

              {/* Staff Assignments */}
              <div className="space-y-2">
                <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                  Assigned Staff members
                </label>
                {staffLoading ? (
                  <div className="flex items-center gap-2 text-xs py-4" style={{ color: "var(--text-muted)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading staff list...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {staffList.map((staff) => {
                      const isSelected = selectedStaffIds.includes(staff.id);
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-[var(--text-secondary)]"
                          }`}
                          disabled={submitting}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{staff.name}</p>
                            <p className="text-[9px] opacity-60 truncate">{staff.role.replace(/_/g, " ")}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary py-2 px-4 text-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-5 text-sm flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingService ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
