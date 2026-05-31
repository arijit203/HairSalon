"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Scissors, Tag, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface ServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingService?: any;
  extraCategories?: string[];
  defaultCategory?: string;
}

export default function ServiceModal({ open, onClose, onSaved, editingService, extraCategories, defaultCategory }: ServiceModalProps) {
  const { success, error: toastError } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing categories
  useEffect(() => {
    if (!open) return;
    fetch("/api/services?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          const cats = d.data.flatMap((s: any) => s.category || []);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setDynamicCategories(uniqueCats.sort());
        }
      })
      .catch((err) => console.error("Error loading services for categories:", err));

    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          const cats = d.data.flatMap((p: any) => p.category || []);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setProductCategories(uniqueCats.sort());
        }
      })
      .catch((err) => console.error("Error loading products for categories:", err));

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wyapar_custom_categories") || localStorage.getItem("wyapar_service_categories");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
             setCustomCategories(parsed);
          }
        } catch (e) {
          console.error("Error parsing custom categories:", e);
        }
      }
    }
  }, [open]);

  const allCategories = useMemo(() => {
    const merged = Array.from(new Set([
      ...dynamicCategories, ...productCategories, ...customCategories, ...(extraCategories || [])
    ]));
    return merged;
  }, [dynamicCategories, productCategories, customCategories, extraCategories]);

  // Load editing service data if provided
  useEffect(() => {
    if (open && editingService) {
      setName(editingService.name || "");
      setDescription(editingService.description || "");
      setCategory(editingService.category || "General");
      setPrice(editingService.price ? String(editingService.price) : "");
      setIsPopular(editingService.isPopular || false);
    } else if (open) {
      setName("");
      setDescription("");
      setCategory(defaultCategory ? defaultCategory : "General");
      setPrice("");
      setIsPopular(false);
      setShowAddCategoryInput(false);
      setNewCategoryName("");
    }
  }, [open, editingService, defaultCategory]);

  const handleAddCategoryInline = () => {
    const nameToUse = newCategoryName.trim();
    if (!nameToUse) return;

    if (allCategories.some((c) => c.toLowerCase() === nameToUse.toLowerCase())) {
      const existing = allCategories.find((c) => c.toLowerCase() === nameToUse.toLowerCase()) || nameToUse;
      setCategory(existing);
    } else {
      const updated = [...customCategories, nameToUse];
      setCustomCategories(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("wyapar_custom_categories", JSON.stringify(updated));
      }
      setCategory(nameToUse);
    }
    setNewCategoryName("");
    setShowAddCategoryInput(false);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toastError("Service name is required");
    if (!category) return toastError("Category is required");
    if (price === "" || parseFloat(price) < 0) return toastError("Price cannot be negative");

    setSubmitting(true);
    try {
      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category,
        price: parseFloat(price),
        isPopular,
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

  if (!mounted) return null;

  return createPortal(
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

              {/* Categories */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                  Categories * (Select one or more)
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] max-h-[140px] overflow-y-auto">
                  {allCategories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border focus:outline-none ${
                          isSelected
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 shadow-[0_2px_8px_rgba(244,63,94,0.06)]"
                            : "border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:border-zinc-300 dark:hover:border-white/[0.12]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  
                  {/* Add Custom Category Inline Form */}
                  {showAddCategoryInput ? (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <input
                        type="text"
                        placeholder="New category..."
                        className="px-3 py-1 text-xs rounded-full border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-800 dark:text-white outline-none focus:border-rose-500/50 w-[120px] transition-all"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCategoryInline();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setShowAddCategoryInput(false);
                            setNewCategoryName("");
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategoryInline}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors focus:outline-none"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInput(false);
                          setNewCategoryName("");
                        }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-white/[0.12] transition-colors focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInput(true)}
                      className="px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-zinc-200 dark:border-white/[0.1] bg-transparent text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-white/30 hover:bg-zinc-50 dark:hover:bg-white/[0.04] hover:text-zinc-800 dark:hover:text-white transition-all flex items-center gap-1 focus:outline-none"
                    >
                      + Add New...
                    </button>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Price (₹) *
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="number"
                    min="0"
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
    </AnimatePresence>,
    document.body
  );
}
