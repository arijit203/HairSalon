"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Package, Tag, Loader2, Archive, Hash, AlertTriangle, ChevronDown, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProduct?: any;
}

export default function ProductModal({ open, onClose, onSaved, editingProduct }: ProductModalProps) {
  const { success, error: toastError } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  
  // Data loading states
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  
  // Basic & Advanced Pricing fields
  const [price, setPrice] = useState("");
  const [salePriceTaxType, setSalePriceTaxType] = useState("WITH_TAX");
  const [salePriceDiscount, setSalePriceDiscount] = useState("");
  const [salePriceDiscountType, setSalePriceDiscountType] = useState("PERCENTAGE");
  
  const [costPrice, setCostPrice] = useState("");
  const [purchasePriceTaxType, setPurchasePriceTaxType] = useState("WITH_TAX");
  const [taxRate, setTaxRate] = useState(5);
  
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [wholesalePriceTaxType, setWholesalePriceTaxType] = useState("WITH_TAX");
  const [showWholesalePrice, setShowWholesalePrice] = useState(false);

  // Stock & Visuals
  const [stock, setStock] = useState("1");
  const [lowStockAt, setLowStockAt] = useState("2");
  const [imageUrl, setImageUrl] = useState("");
  
  // Modal state
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch unique categories & all products in the DB on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setAllProducts(d.data);
          const cats = d.data.flatMap((p: any) => p.category || []);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setDynamicCategories(uniqueCats.sort());
        }
      })
      .catch((err) => console.error("Error loading products/categories:", err));

    fetch("/api/services?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          const cats = d.data.map((s: any) => s.category);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setServiceCategories(uniqueCats.sort());
        }
      })
      .catch((err) => console.error("Error loading service categories:", err));

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wyapar_custom_categories") || localStorage.getItem("wyapar_service_categories");
      if (saved) {
        try {
          setCustomCategories(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing custom categories:", e);
        }
      }
    }
  }, [open]);

  const allCategories = useMemo(() => {
    const defaultCats = ["Hair Care", "Skin Care", "Nail Care", "Body Care", "Packages", "Tools", "Spa"];
    const merged = Array.from(new Set([...defaultCats, ...dynamicCategories, ...serviceCategories, ...customCategories]));
    return merged;
  }, [dynamicCategories, serviceCategories, customCategories]);

  // Load existing details when editing
  useEffect(() => {
    if (open && editingProduct) {
      setName(editingProduct.name || "");
      setDescription(editingProduct.description || "");
      setBrand(editingProduct.brand || "");
      setSku(editingProduct.sku || "");
      setSelectedCategories(editingProduct.category || []);
      setPrice(editingProduct.price ? String(editingProduct.price) : "");
      setCostPrice(editingProduct.costPrice ? String(editingProduct.costPrice) : "");
      setStock(editingProduct.stock !== undefined ? String(editingProduct.stock) : "1");
      setLowStockAt(editingProduct.lowStockAt !== undefined ? String(editingProduct.lowStockAt) : "2");
      setImageUrl(editingProduct.imageUrl || "");
      
      // Load advanced pricing options
      setSalePriceTaxType(editingProduct.salePriceTaxType || "WITH_TAX");
      setSalePriceDiscount(editingProduct.salePriceDiscount !== undefined && editingProduct.salePriceDiscount !== 0 ? String(editingProduct.salePriceDiscount) : "");
      setSalePriceDiscountType(editingProduct.salePriceDiscountType || "PERCENTAGE");
      setPurchasePriceTaxType(editingProduct.purchasePriceTaxType || "WITH_TAX");
      setWholesalePrice(editingProduct.wholesalePrice ? String(editingProduct.wholesalePrice) : "");
      setWholesalePriceTaxType(editingProduct.wholesalePriceTaxType || "WITH_TAX");
      setShowWholesalePrice(!!editingProduct.wholesalePrice);
      setTaxRate(editingProduct.taxRate !== undefined ? Number(editingProduct.taxRate) : 5);
    } else if (open) {
      setName("");
      setDescription("");
      setBrand("");
      setSku("");
      setSelectedCategories([]);
      setPrice("");
      setCostPrice("");
      setStock("1");
      setLowStockAt("2");
      setImageUrl("");
      
      // Reset advanced pricing options
      setSalePriceTaxType("WITH_TAX");
      setSalePriceDiscount("");
      setSalePriceDiscountType("PERCENTAGE");
      setPurchasePriceTaxType("WITH_TAX");
      setWholesalePrice("");
      setWholesalePriceTaxType("WITH_TAX");
      setShowWholesalePrice(false);
      setTaxRate(5);
    }
    setShowSuggestions(false);
  }, [open, editingProduct]);

  useEffect(() => {
    if (showWholesalePrice) {
      setSalePriceDiscount("");
    }
  }, [showWholesalePrice]);

  // Filter autocomplete suggestions based on the typed product name
  const suggestions = useMemo(() => {
    if (!name.trim()) return [];
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(name.toLowerCase())
    ).slice(0, 5);
  }, [name, allProducts]);

  const handleSelectSuggestion = (prod: any) => {
    setName(prod.name);
    setBrand(prod.brand);
    setSku(prod.sku);
    setSelectedCategories(prod.category || []);
    setPrice(prod.price ? String(prod.price) : "");
    setCostPrice(prod.costPrice ? String(prod.costPrice) : "");
    setSalePriceTaxType(prod.salePriceTaxType || "WITH_TAX");
    setSalePriceDiscount(prod.salePriceDiscount !== undefined && prod.salePriceDiscount !== 0 ? String(prod.salePriceDiscount) : "");
    setSalePriceDiscountType(prod.salePriceDiscountType || "PERCENTAGE");
    setPurchasePriceTaxType(prod.purchasePriceTaxType || "WITH_TAX");
    setWholesalePrice(prod.wholesalePrice ? String(prod.wholesalePrice) : "");
    setWholesalePriceTaxType(prod.wholesalePriceTaxType || "WITH_TAX");
    setShowWholesalePrice(!!prod.wholesalePrice);
    setTaxRate(prod.taxRate !== undefined ? Number(prod.taxRate) : 5);
    setShowSuggestions(false);
    success(`Autofilled details from pre-existing product: ${prod.name}`);
  };

  // Automatically calculate Purchase Price (costPrice) from Sale Price or Wholesale Price and Discount/Tax
  useEffect(() => {
    const wholesaleVal = parseFloat(wholesalePrice);
    const isWholesaleActive = showWholesalePrice && !isNaN(wholesaleVal) && wholesaleVal > 0;

    let basePrice = 0;
    let activeTaxType = "WITH_TAX";

    if (isWholesaleActive) {
      basePrice = wholesaleVal;
      activeTaxType = wholesalePriceTaxType;
    } else {
      const salePriceVal = parseFloat(price);
      if (isNaN(salePriceVal) || salePriceVal <= 0) {
        setCostPrice("");
        return;
      }
      basePrice = salePriceVal;
      activeTaxType = salePriceTaxType;
    }

    // 1. Calculate Net Price (after discount if wholesale price is not active)
    let netPrice = basePrice;
    if (!isWholesaleActive) {
      const discountVal = salePriceDiscount.trim() === "" ? 0 : parseFloat(salePriceDiscount);
      const dVal = isNaN(discountVal) ? 0 : discountVal;
      if (salePriceDiscountType === "PERCENTAGE") {
        netPrice = basePrice * (1 - dVal / 100);
      } else {
        netPrice = basePrice - dVal;
      }
    }
    netPrice = Math.max(0, netPrice);

    // 2. Purchase Price is always WITH_TAX
    let calculatedPurchasePrice = netPrice;
    const taxMultiplier = 1 + (taxRate / 100);

    if (activeTaxType === "WITHOUT_TAX") {
      // Base price excludes tax. Since Purchase Price must be WITH_TAX, we apply taxMultiplier
      calculatedPurchasePrice = netPrice * taxMultiplier;
    } else {
      // Base price includes tax. Since Purchase Price must be WITH_TAX, they match directly
      calculatedPurchasePrice = netPrice;
    }

    const rounded = Math.round(calculatedPurchasePrice * 100) / 100;
    setCostPrice(String(rounded));
  }, [price, salePriceDiscount, salePriceDiscountType, salePriceTaxType, taxRate, wholesalePrice, wholesalePriceTaxType, showWholesalePrice]);

  const handleAssignCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "IC-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSku(result);
  };

  const handleAddCategoryInline = () => {
    const nameToUse = newCategoryName.trim();
    if (!nameToUse) return;

    if (allCategories.some((c) => c.toLowerCase() === nameToUse.toLowerCase())) {
      const existing = allCategories.find((c) => c.toLowerCase() === nameToUse.toLowerCase()) || nameToUse;
      if (!selectedCategories.includes(existing)) {
        setSelectedCategories([...selectedCategories, existing]);
      }
    } else {
      const updated = [...customCategories, nameToUse];
      setCustomCategories(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("wyapar_custom_categories", JSON.stringify(updated));
      }
      setSelectedCategories([...selectedCategories, nameToUse]);
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
    if (!name.trim()) return toastError("Product name is required");
    if (!brand.trim()) return toastError("Brand is required");
    if (!sku.trim()) return toastError("Item Code is required");

    if (selectedCategories.length === 0) {
      return toastError("At least one category is required");
    }

    if (price.trim() === "") {
      return toastError("Sale Price is required");
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return toastError("Sale Price cannot be negative");
    }

    let parsedCostPrice: number | undefined = undefined;
    if (costPrice.trim() !== "") {
      parsedCostPrice = parseFloat(costPrice);
      if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
        return toastError("Purchase Price cannot be negative");
      }
    }

    const parsedDiscount = salePriceDiscount.trim() === "" ? 0 : parseFloat(salePriceDiscount);
    if (isNaN(parsedDiscount) || parsedDiscount < 0) {
      return toastError("Discount on Sale Price cannot be negative");
    }

    let parsedWholesalePrice: number | undefined = undefined;
    if (showWholesalePrice && wholesalePrice.trim() !== "") {
      parsedWholesalePrice = parseFloat(wholesalePrice);
      if (isNaN(parsedWholesalePrice) || parsedWholesalePrice < 0) {
        return toastError("Wholesale Price cannot be negative");
      }
    }

    if (stock.trim() === "") {
      return toastError("Quantity Purchased is required");
    }
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return toastError("Quantity Purchased cannot be negative");
    }

    if (lowStockAt.trim() === "") {
      return toastError("Low Stock Threshold is required");
    }
    const parsedLowStock = parseInt(lowStockAt, 10);
    if (isNaN(parsedLowStock) || parsedLowStock < 0) {
      return toastError("Low Stock Threshold cannot be negative");
    }

    if (imageUrl.trim() !== "") {
      try {
        new URL(imageUrl.trim());
      } catch (err) {
        return toastError("Please enter a valid Image URL (e.g. https://...)");
      }
    }

    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        brand: brand.trim(),
        sku: sku.trim(),
        category: selectedCategories,
        price: parsedPrice,
        costPrice: parsedCostPrice,
        stock: parsedStock,
        lowStockAt: parsedLowStock,
        imageUrl: imageUrl.trim() || undefined,
        
        salePriceTaxType,
        salePriceDiscount: (showWholesalePrice && parsedWholesalePrice !== undefined) ? 0 : parsedDiscount,
        salePriceDiscountType,
        purchasePriceTaxType,
        wholesalePrice: parsedWholesalePrice,
        wholesalePriceTaxType,
        taxRate: Number(taxRate),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save product");
      }

      if (editingProduct) {
        success("Product updated successfully!");
      } else if (data.data && data.data._upserted) {
        success(`Quantity added successfully to the existing product: ${name}`);
      } else {
        success("Product created successfully!");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while saving the product.");
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

          {/* Modal Container (Wider Rectangular max-w-4xl Layout) */}
          <motion.div
            className="relative w-full max-w-4xl flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              maxHeight: "92vh",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}>
                  {editingProduct ? "Edit Product" : "Add New Product"}
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT COLUMN: General Information */}
                <div className="space-y-4">
                  {/* Product Name & Autocomplete Suggestions */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Product Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Keratin Nutritive Serum"
                      className="input-field"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      disabled={submitting}
                      required
                    />
                    
                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div 
                        className="absolute left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden max-h-[200px] overflow-y-auto"
                        style={{ 
                          backgroundColor: "var(--bg-dropdown)", 
                          borderColor: "var(--border-default)" 
                        }}
                      >
                        <div 
                          className="px-3 py-1.5 text-[10px] font-bold border-b"
                          style={{ 
                            color: "var(--text-muted)", 
                            borderColor: "var(--border-subtle)" 
                          }}
                        >
                          PRE-EXISTING PRODUCTS (SELECT TO AUTOFILL)
                        </div>
                        {suggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(prod)}
                            className="w-full text-left px-3 py-2.5 text-xs transition-colors border-b last:border-b-0 flex items-center justify-between hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                            style={{ 
                              borderColor: "var(--border-subtle)" 
                            }}
                          >
                            <div>
                              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{prod.name}</span>
                              <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>({prod.brand})</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300">
                              {prod.sku}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Brand & Item Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Brand *
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. Kérastase"
                          className="input-field"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Item Code *
                        </label>
                        <button
                          type="button"
                          onClick={handleAssignCode}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-all"
                        >
                          Assign Code
                        </button>
                      </div>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        <input
                          type="text"
                          placeholder="KER-001"
                          className="input-field pl-9"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Multi-Select with toggleable selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                      Categories * (Select one or more)
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] max-h-[140px] overflow-y-auto">
                      {allCategories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCategories(selectedCategories.filter(c => c !== cat));
                              } else {
                                setSelectedCategories([...selectedCategories, cat]);
                              }
                            }}
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

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe the product details, benefits, or usage instructions..."
                      className="input-field resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Advanced Pricing, Discounts, Stock & Visuals */}
                <div className="space-y-4">
                  {/* Sale Price block */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                      Individual Unit Price (Sale Price) *
                    </label>
                    
                    {/* Sale Price input + Tax selection */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Individual Unit Price"
                          className="input-field pl-9 w-full"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                      <div className="relative w-[135px] flex-shrink-0">
                        <select
                          className="input-field appearance-none pr-8 cursor-pointer w-full"
                          value={salePriceTaxType}
                          onChange={(e) => setSalePriceTaxType(e.target.value)}
                        >
                          <option value="WITH_TAX" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>With Tax</option>
                          <option value="WITHOUT_TAX" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Without Tax</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                      </div>
                    </div>

                    {/* Sale Price discount on top */}
                    {!showWholesalePrice && (
                      <div className="flex gap-2 animate-fade-in">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Discount"
                            className="input-field w-full"
                            value={salePriceDiscount}
                            onChange={(e) => setSalePriceDiscount(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                        <div className="relative w-[135px] flex-shrink-0">
                          <select
                            className="input-field appearance-none pr-8 cursor-pointer w-full"
                            value={salePriceDiscountType}
                            onChange={(e) => setSalePriceDiscountType(e.target.value)}
                          >
                            <option value="PERCENTAGE" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Percentage</option>
                            <option value="AMOUNT" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Value</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                        </div>
                      </div>
                    )}

                    {/* Wholesale Price toggle */}
                    {!showWholesalePrice ? (
                      <button
                        type="button"
                        onClick={() => setShowWholesalePrice(true)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 mt-1 transition-all"
                      >
                        + Add Wholesale Price
                      </button>
                    ) : (
                      <div className="space-y-1.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] animate-fade-in">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Wholesale Price (₹)</label>
                          <button
                            type="button"
                            onClick={() => { setShowWholesalePrice(false); setWholesalePrice(""); }}
                            className="text-[10px] text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Wholesale Price"
                              className="input-field pl-9 w-full"
                              value={wholesalePrice}
                              onChange={(e) => setWholesalePrice(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div className="relative w-[135px] flex-shrink-0">
                            <select
                              className="input-field appearance-none pr-8 cursor-pointer w-full"
                              value={wholesalePriceTaxType}
                              onChange={(e) => setWholesalePriceTaxType(e.target.value)}
                            >
                              <option value="WITH_TAX" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>With Tax</option>
                              <option value="WITHOUT_TAX" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Without Tax</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tax Rate Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                      Tax Rate (GST)
                    </label>
                    <div className="relative">
                      <select
                        className="input-field appearance-none pr-10 cursor-pointer w-full"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                      >
                        <option value="0" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>0% (Exempt)</option>
                        <option value="5" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>5% GST</option>
                        <option value="12" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>12% GST</option>
                        <option value="18" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>18% GST</option>
                        <option value="28" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>28% GST</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                    </div>
                  </div>

                  {/* Purchase Price block */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                      Total Purchase Amt (With Tax)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                      <input
                        type="text"
                        placeholder="0.00"
                        className="input-field pl-9 w-full bg-zinc-100/50 dark:bg-white/[0.02] cursor-not-allowed"
                        value={(() => {
                          const salePrice = parseFloat(price);
                          if (isNaN(salePrice) || salePrice <= 0) return "0.00";

                          const wpVal = parseFloat(wholesalePrice);
                          const isWholesaleActive = showWholesalePrice && !isNaN(wpVal) && wpVal > 0;
                          const basePrice = isWholesaleActive ? wpVal : salePrice;

                          const qty = parseInt(stock, 10) || 1;
                          const discountAmt = isWholesaleActive ? 0 : (parseFloat(salePriceDiscount) || 0);

                          // Apply discount
                          let effectivePrice = basePrice;
                          if (discountAmt > 0) {
                            if (salePriceDiscountType === "PERCENTAGE") {
                              effectivePrice = basePrice * (1 - discountAmt / 100);
                            } else {
                              effectivePrice = Math.max(0, basePrice - discountAmt);
                            }
                          }

                          // Apply tax only if the base price is WITHOUT tax
                          const baseTaxType = isWholesaleActive
                            ? wholesalePriceTaxType
                            : salePriceTaxType;
                          if (baseTaxType === "WITHOUT_TAX") {
                            effectivePrice = effectivePrice * (1 + taxRate / 100);
                          }

                          return (effectivePrice * qty).toFixed(2);
                        })()}
                        readOnly
                      />
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {(() => {
                        const wp = parseFloat(wholesalePrice);
                        const sp = parseFloat(price);
                        const usingWholesale = showWholesalePrice && !isNaN(wp) && wp > 0;
                        const qty = parseInt(stock, 10);
                        const basis = usingWholesale
                          ? `₹${wp.toFixed(2)} wholesale`
                          : "sale price";
                        const discountSuffix = usingWholesale ? "" : " after discount";
                        return qty > 0
                          ? `${qty} unit(s) × ${basis}${discountSuffix}`
                          : `Per-unit total based on ${basis} (qty not set)`;
                      })()}
                    </p>
                  </div>

                  {/* Initial Stock & Low Stock Alert */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Quantity Purchased *
                      </label>
                      <div className="relative">
                        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="1"
                          className="input-field pl-9"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Low Stock Threshold *
                      </label>
                      <div className="relative">
                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="10"
                          className="input-field pl-9"
                          value={lowStockAt}
                          onChange={(e) => setLowStockAt(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Image URL (Optional)
                    </label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                      <input
                        type="url"
                        placeholder="https://..."
                        className="input-field pl-9"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[var(--border-subtle)]">
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
                  {editingProduct ? "Update Product" : "Add Product"}
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
