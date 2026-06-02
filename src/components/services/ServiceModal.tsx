"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Scissors, Tag, Loader2, ChevronDown, Sparkles, Check, Package, Search } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { isComboCategory, parseComboIds } from "@/lib/services";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip [combo:...] tag from description text for display */
function stripComboTag(desc: string): string {
  return (desc || "").replace(/\s*\[combo:[^\]]*\]/, "").trim();
}

/** Build description with combo tag appended */
function buildDescription(cleanDesc: string, comboIds: string[]): string | undefined {
  const base = cleanDesc.trim();
  if (comboIds.length === 0) return base || undefined;
  const tag = `[combo:${comboIds.join(",")}]`;
  return base ? `${base} ${tag}` : tag;
}

// ─── Component ────────────────────────────────────────────────────────────────


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

  // Combo state
  const [allServices, setAllServices] = useState<{ id: string; name: string; price: number; category: string }[]>([]);
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [comboServiceSearch, setComboServiceSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing categories and all services (for combo selection)
  useEffect(() => {
    if (!open) return;

    // Load services
    setServicesLoading(true);
    fetch("/api/services?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          // Deduplicate categories
          const cats = d.data.map((s: any) => s.category).filter(Boolean);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setDynamicCategories(uniqueCats.sort());

          // Store all non-combo services for combo selection
          const nonCombos = d.data.filter((s: any) => !isComboCategory(s.category || ""));
          setAllServices(
            nonCombos.map((s: any) => ({
              id: s.id,
              name: s.name,
              price: Number(s.price),
              category: s.category,
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading services:", err))
      .finally(() => setServicesLoading(false));

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

    // Load custom categories from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wyapar_custom_categories");
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
      const rawDesc: string = editingService.description || "";
      setDescription(stripComboTag(rawDesc));
      setSelectedComboIds(parseComboIds(rawDesc));
      setCategory(editingService.category || "");
      setPrice(editingService.price ? String(editingService.price) : "");
      setIsPopular(editingService.isPopular || false);
    } else if (open) {
      setName("");
      setDescription("");
      setSelectedComboIds([]);
      setCategory(defaultCategory ? defaultCategory : (allCategories[0] || ""));
      setPrice("");
      setIsPopular(false);
      setShowAddCategoryInput(false);
      setNewCategoryName("");
    }
  }, [open, editingService, defaultCategory, allCategories]);

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

    // Validate combo
    if (isComboCategory(category) && selectedComboIds.length < 2) {
      return toastError("A combo must include at least 2 services");
    }

    setSubmitting(true);
    try {
      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PATCH" : "POST";

      // Build description – embed combo tag if needed
      const finalDescription = isComboCategory(category)
        ? buildDescription(description, selectedComboIds)
        : description.trim() || undefined;

      const payload = {
        name: name.trim(),
        description: finalDescription,
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

  // Derived: is the current category a combo?
  const isCombo = isComboCategory(category);

  // Derived: filtered services based on search query
  const filteredComboServices = useMemo(() => {
    return allServices.filter(s => 
      s.name.toLowerCase().includes(comboServiceSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(comboServiceSearch.toLowerCase())
    );
  }, [allServices, comboServiceSearch]);

  // Derived: total list price of selected combo services
  const comboTotalListPrice = useMemo(() => {
    return allServices
      .filter((s) => selectedComboIds.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [allServices, selectedComboIds]);

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
                {isCombo ? (
                  <Package className="w-5 h-5 text-violet-400" />
                ) : (
                  <Scissors className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}>
                  {editingService ? (isCombo ? "Edit Combo Offer" : "Edit Service") : (isCombo ? "Add Combo Offer" : "Add New Service")}
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
                  {isCombo ? "Combo Name *" : "Service Name *"}
                </label>
                <input
                  type="text"
                  placeholder={isCombo ? "e.g., Hair Cut & Facial Combo" : "e.g., Keratin Treatment"}
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
                  Category *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10"
                      value={showAddCategoryInput ? "__new__" : category}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__new__") {
                          setShowAddCategoryInput(true);
                        } else {
                          setShowAddCategoryInput(false);
                          setCategory(val);
                          // Reset combo selection when switching away from combo category
                          if (!isComboCategory(val)) {
                            setSelectedComboIds([]);
                          }
                        }
                      }}
                      disabled={submitting}
                      required
                    >
                      <option value="" disabled>Select a category</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__new__">+ Add New Category...</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Add Custom Category Inline Form */}
                  {showAddCategoryInput && (
                    <div className="flex items-center gap-1.5 animate-fade-in mt-2">
                      <input
                        type="text"
                        placeholder="New category..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#1a1a1a] text-zinc-800 dark:text-white outline-none focus:border-rose-500/50 transition-all"
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
                            if (allCategories.length > 0) {
                               setCategory(allCategories[0]);
                            } else {
                               setCategory("");
                            }
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategoryInline}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors focus:outline-none"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInput(false);
                          setNewCategoryName("");
                          if (allCategories.length > 0) {
                             setCategory(allCategories[0]);
                          } else {
                             setCategory("");
                          }
                        }}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-white/[0.12] text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── COMBO SERVICE SELECTOR ─────────────────────────────── */}
              {isCombo && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                    Enclosed Services *{" "}
                    <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                      (select at least 2)
                    </span>
                  </label>

                  {/* Info banner */}
                  {comboTotalListPrice > 0 && (
                    <div
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                      style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Sum of selected services
                      </span>
                      <span className="font-bold text-violet-400">
                        ₹{comboTotalListPrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {/* Search filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Search services by name or category..."
                      className="input-field pl-9 text-xs"
                      value={comboServiceSearch}
                      onChange={(e) => setComboServiceSearch(e.target.value)}
                      disabled={servicesLoading}
                    />
                  </div>

                  {/* Service checkbox list */}
                  <div
                    className="rounded-xl overflow-hidden max-h-52 overflow-y-auto"
                    style={{ border: "1px solid var(--border-default)" }}
                  >
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      </div>
                    ) : allServices.length === 0 ? (
                      <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>
                        No services found. Add individual services first.
                      </p>
                    ) : filteredComboServices.length === 0 ? (
                      <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>
                        No services match your search.
                      </p>
                    ) : (
                      filteredComboServices.map((svc) => {
                        const checked = selectedComboIds.includes(svc.id);
                        return (
                          <label
                            key={svc.id}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                            style={{
                              background: checked ? "rgba(139,92,246,0.07)" : "transparent",
                              borderBottom: "1px solid var(--border-subtle)",
                            }}
                          >
                            {/* Custom checkbox */}
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{
                                background: checked ? "#8b5cf6" : "transparent",
                                border: `1.5px solid ${checked ? "#8b5cf6" : "var(--border-default)"}`,
                              }}
                            >
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => {
                                setSelectedComboIds((prev) =>
                                  checked ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                                );
                              }}
                              disabled={submitting}
                            />
                            <span className="flex-1 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                              {svc.name}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                              ₹{svc.price.toLocaleString("en-IN")}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {selectedComboIds.length > 0 && (
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {selectedComboIds.length} service{selectedComboIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {isCombo ? "Combo Price (₹) *" : "Price (₹) *"}
                  {isCombo && comboTotalListPrice > 0 && (
                    <span className="ml-2 font-normal text-violet-400">
                      (save ₹{Math.max(0, comboTotalListPrice - (parseFloat(price) || 0)).toLocaleString("en-IN")} vs. individual)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={isCombo ? "e.g., 1200 (less than sum above)" : "800"}
                    className="input-field pl-9"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                {isCombo && comboTotalListPrice > 0 && parseFloat(price) >= comboTotalListPrice && (
                  <p className="text-[10px] text-amber-500">
                    ⚠️ Combo price should be less than the sum (₹{comboTotalListPrice.toLocaleString("en-IN")}) to offer a discount
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder={isCombo ? "Describe what is included or any special notes..." : "Describe the service details, products used, or who it is best for..."}
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
                    Feature this {isCombo ? "combo" : "service"}
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
                  style={isCombo ? { background: "linear-gradient(135deg, #7c3aed, #a855f7)" } : {}}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingService ? (isCombo ? "Update Combo" : "Update Service") : (isCombo ? "Create Combo" : "Create Service")}
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
