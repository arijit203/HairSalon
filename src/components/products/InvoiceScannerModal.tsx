"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Smartphone, FileText, Loader2, CheckCircle2, AlertCircle,
  Camera, ArrowRight, ArrowLeft, Package, Pencil, Trash2, Plus, RefreshCw,
  QrCode, ScanLine, Sparkles, Check
} from "lucide-react";
import QRCode from "qrcode";

interface ParsedItem {
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  suggestedCategories: string[];
  itemCode: string;
  taxRate: number;
  action: "update" | "create" | "conflict";
  conflictType?: "price-mismatch";
  productId?: string;
  existingStock?: number;
  existingName?: string;
  existingBrand?: string;
  existingCategory?: string[];
  existingSku?: string;
  existingCostPrice?: number;
  existingPrice?: number;
  salePrice?: number;
  costPrice?: number;
}

interface InvoiceScannerModalProps {
  open: boolean;
  onClose: () => void;
  onProductsUpdated: () => void;
}

type Step = "upload" | "processing" | "review" | "success";

export default function InvoiceScannerModal({ open, onClose, onProductsUpdated }: InvoiceScannerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [scannedGrandTotal, setScannedGrandTotal] = useState<number>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [processingError, setProcessingError] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [successResults, setSuccessResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingBackup, setEditingBackup] = useState<ParsedItem | null>(null);
  const [allCategoriesList, setAllCategoriesList] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);

  // Load custom categories from localStorage
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const saved = localStorage.getItem("wyapar_custom_categories") || localStorage.getItem("wyapar_service_categories");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAllCategoriesList((prev) => Array.from(new Set([...prev, ...parsed])));
          }
        } catch (e) {
          console.error("Error parsing custom categories:", e);
        }
      }
    }
  }, [open]);

  useEffect(() => setMounted(true), []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("upload");
      setItems([]);
      setScannedGrandTotal(0);
      setImagePreview(null);
      setProcessingError("");
      setSuccessResults(null);
      setQrDataUrl(null);
      setSessionId("");
      setEditingIndex(null);
      setEditingBackup(null);

      // Load products and categories for client-side matching
      fetch("/api/products?limit=1000")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setExistingProducts(data.data);
            const productCats = data.data.flatMap((p: any) => p.category || []);
            setAllCategoriesList((prev) => {
              const merged = new Set([...prev, ...productCats]);
              return Array.from(merged).filter(Boolean).sort();
            });
          }
        })
        .catch((err) => console.error("Error loading products/categories:", err));
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [open]);

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    onClose();
  };

  // Generate QR code with session ID
  const generateQR = async () => {
    const id = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setSessionId(id);

    const appUrl = window.location.origin;
    const uploadUrl = `${appUrl}/invoice-upload/${id}`;

    try {
      const dataUrl = await QRCode.toDataURL(uploadUrl, {
        width: 220,
        margin: 2,
        color: { dark: "#150810", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);

      // Start polling for upload
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/invoice-scan/upload?sessionId=${id}`);
          const data = await res.json();
          if (data.success && data.data.uploaded) {
            clearInterval(interval);
            setPollingInterval(null);
            // Set image preview from QR-uploaded image before processing
            setImagePreview(`data:${data.data.mimeType};base64,${data.data.image}`);
            processImage(data.data.image, data.data.mimeType);
          }
        } catch {
          // Silently retry
        }
      }, 2000);

      setPollingInterval(interval);

      // Auto-expire after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        setPollingInterval(null);
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("QR generation error:", err);
    }
  };

  // Handle file upload from desktop
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);

      // Extract base64 data (remove the data:image/xxx;base64, prefix)
      const base64 = result.split(",")[1];
      const mimeType = file.type;
      processImage(base64, mimeType);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  // Process image with AI
  const processImage = async (base64Image: string, mimeType: string) => {
    setStep("processing");
    setProcessingError("");

    try {
      const res = await fetch("/api/invoice-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, mimeType }),
      });

      // Safely parse response — server may return plain text on crash/timeout
      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Server returned non-JSON (e.g. "A server error occurred" or HTML error page)
        console.error("Non-JSON response from /api/invoice-scan:", responseText.slice(0, 200));
        throw new Error(
          res.status === 504 || res.status === 502
            ? "The request timed out. The invoice may be too large or the AI service is slow. Please try again."
            : "The server encountered an error while processing the invoice. Please try again."
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to process invoice");
      }

      if (data.data.items.length === 0) {
        setProcessingError("No items could be detected from this image. Please try with a clearer invoice image.");
        return;
      }

      const processed = data.data.items.map((item: any) => {
        if (item.action === "update") {
          return {
            ...item,
            name: item.existingName || item.name,
            brand: item.existingBrand || item.brand,
            suggestedCategories: item.existingCategory || item.suggestedCategories,
            itemCode: item.existingSku || item.itemCode || "",
            taxRate: typeof item.taxRate === "number" ? item.taxRate : 0,
          };
        }
        return {
          ...item,
          itemCode: item.itemCode || "",
          taxRate: typeof item.taxRate === "number" ? item.taxRate : 0,
        };
      });
      setItems(processed);
      setScannedGrandTotal(data.data.invoiceGrandTotal || 0);
      setStep("review");
    } catch (err: any) {
      setProcessingError(err.message || "Failed to process the invoice. Please try again.");
    }
  };

  // Save edited row and run conflict/matching logic client-side
  const handleSaveRow = (idx: number) => {
    const item = items[idx];
    
    // Find best match in existingProducts
    let bestMatch: any = null;
    let highestSimilarity = 0.50; // 50% threshold
    let isPartialOverlap = false;

    for (const p of existingProducts) {
      // 1. Check SKU / itemCode exact match first
      const itemSku = (item.itemCode || "").toLowerCase().trim();
      const pSku = (p.sku || "").toLowerCase().trim();
      
      if (itemSku && pSku && itemSku === pSku) {
        bestMatch = p;
        highestSimilarity = 1.0;
        isPartialOverlap = false;
        break;
      }

      // 2. Check SKU / itemCode similarity >= 0.50
      const codeSim = itemSku && pSku ? getStringSimilarity(pSku, itemSku) : 0;
      if (codeSim >= 0.50) {
        bestMatch = p;
        highestSimilarity = codeSim;
        isPartialOverlap = false;
        break;
      }

      // 3. Brand matches if both are empty, one contains the other, or similarity is >= 50%
      const pBrandNorm = (p.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o").trim();
      const iBrandNorm = (item.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o").trim();
      const brandSim = getStringSimilarity(p.brand || "", item.brand || "");
      const brandMatches = 
        (pBrandNorm === "" && iBrandNorm === "") || 
        (pBrandNorm !== "" && iBrandNorm !== "" && (pBrandNorm.includes(iBrandNorm) || iBrandNorm.includes(pBrandNorm) || brandSim >= 0.50));
      if (!brandMatches) continue;

      // 4. Name similarity >= 50%
      const nameSim = getStringSimilarity(p.name, item.name);
      if (nameSim >= highestSimilarity) {
        highestSimilarity = nameSim;
        bestMatch = p;
        isPartialOverlap = false;
      } else if (hasWordOverlap(p.name, item.name) && !bestMatch) {
        bestMatch = p;
        isPartialOverlap = true;
      }
    }

    if (bestMatch) {
      const existingCost = Number(bestMatch.costPrice || bestMatch.price || 0);
      const newCost = item.unitPrice;
      
      // If price differs by more than 1 unit, or it's a partial match, flag as conflict
      const priceDiffers = Math.abs(existingCost - newCost) > 1.0;
      const needsResolution = priceDiffers || isPartialOverlap;

      if (needsResolution) {
        updateItem(idx, {
          action: "conflict",
          conflictType: "price-mismatch",
          productId: bestMatch.id,
          existingStock: bestMatch.stock,
          existingName: bestMatch.name,
          existingBrand: bestMatch.brand,
          existingCategory: bestMatch.category,
          existingSku: bestMatch.sku,
          existingCostPrice: existingCost,
          existingPrice: Number(bestMatch.price || 0),
        });
      } else {
        updateItem(idx, {
          action: "update",
          productId: bestMatch.id,
          existingStock: bestMatch.stock,
          existingName: bestMatch.name,
          existingBrand: bestMatch.brand,
          existingCategory: bestMatch.category,
          existingSku: bestMatch.sku,
          existingCostPrice: existingCost,
          existingPrice: Number(bestMatch.price || 0),
        });
      }
    } else {
      updateItem(idx, {
        action: "create",
        productId: undefined,
        existingStock: undefined,
        existingName: undefined,
        existingBrand: undefined,
        existingCategory: undefined,
        existingSku: undefined,
        existingCostPrice: undefined,
        existingPrice: undefined,
      });
    }

    setEditingIndex(null);
    setEditingBackup(null);
  };

  // Confirm and add products
  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      const confirmItems = items.map((item) => ({
        action: item.action === "conflict" ? "create" as const : item.action, // Fallback safety
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        categories: item.suggestedCategories,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        itemCode: item.itemCode,
        taxRate: item.taxRate,
      }));

      const res = await fetch("/api/invoice-scan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: confirmItems }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add products");
      }

      setSuccessResults(data.data);
      setStep("success");
      onProductsUpdated();
    } catch (err: any) {
      setProcessingError(err.message || "Failed to add products.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // Update an item
  const updateItem = (index: number, updates: Partial<ParsedItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
    if ('unitPrice' in updates || 'quantity' in updates || 'discount' in updates || 'taxRate' in updates) {
      setScannedGrandTotal(0);
    }
  };

  // Remove an item
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
    setScannedGrandTotal(0);
  };

  if (!mounted) return null;

  const updateCount = items.filter((i) => i.action === "update").length;
  const createCount = items.filter((i) => i.action === "create").length;
  const conflictCount = items.filter((i) => i.action === "conflict").length;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(168,85,247,0.15))",
                  }}
                >
                  <ScanLine className="w-4.5 h-4.5" style={{ color: "var(--accent-rose, #f43f5e)" }} />
                </div>
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
                  >
                    {step === "upload" && "Scan Invoice"}
                    {step === "processing" && "Analyzing Invoice"}
                    {step === "review" && "Review Items"}
                    {step === "success" && "Items Added!"}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {step === "upload" && "Upload an invoice to auto-add products"}
                    {step === "processing" && "AI is extracting product details..."}
                    {step === "review" && `${items.length} items detected — review before adding`}
                    {step === "success" && "Products have been updated in your inventory"}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="btn-icon w-8 h-8 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {(["upload", "processing", "review", "success"] as Step[]).map((s, i) => {
                const stepNames = ["Upload", "Analyze", "Review", "Done"];
                const isActive = s === step;
                const isPast = ["upload", "processing", "review", "success"].indexOf(step) > i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                        style={{
                          background: isPast
                            ? "rgba(16, 185, 129, 0.15)"
                            : isActive
                            ? "linear-gradient(135deg, #f43f5e, #e11d48)"
                            : "rgba(255,255,255,0.05)",
                          color: isPast ? "#10b981" : isActive ? "#fff" : "var(--text-muted)",
                          border: isPast
                            ? "1px solid rgba(16,185,129,0.3)"
                            : isActive
                            ? "none"
                            : "1px solid var(--border-default)",
                          boxShadow: isActive ? "0 2px 8px rgba(244,63,94,0.3)" : "none",
                        }}
                      >
                        {isPast ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                      >
                        {stepNames[i]}
                      </span>
                    </div>
                    {i < 3 && (
                      <div
                        className="w-8 h-px"
                        style={{
                          background: isPast
                            ? "rgba(16,185,129,0.3)"
                            : "var(--border-default)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {/* ──── STEP 1: UPLOAD ──── */}
                {step === "upload" && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* QR Code Option */}
                      <div
                        className="rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: "var(--bg-card)",
                          border: qrDataUrl ? "1.5px solid rgba(244,63,94,0.4)" : "1px solid var(--border-default)",
                          boxShadow: qrDataUrl ? "0 0 20px rgba(244,63,94,0.1)" : "none",
                        }}
                        onClick={() => !qrDataUrl && generateQR()}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(168,85,247,0.12)" }}
                          >
                            <QrCode className="w-4 h-4" style={{ color: "#a855f7" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              Scan QR Code
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              Upload from mobile
                            </p>
                          </div>
                        </div>

                        {!qrDataUrl ? (
                          <div
                            className="w-full aspect-square max-w-[180px] mx-auto rounded-xl flex flex-col items-center justify-center gap-2"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1.5px dashed var(--border-default)",
                            }}
                          >
                            <Smartphone className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                              Click to generate QR
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div
                              className="p-3 rounded-xl"
                              style={{ background: "white" }}
                            >
                              <img src={qrDataUrl} alt="QR Code" className="w-[180px] h-[180px]" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ background: "#f43f5e" }}
                              />
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                Waiting for upload...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Direct Upload Option */}
                      <div
                        className="rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: dragActive ? "rgba(244,63,94,0.05)" : "var(--bg-card)",
                          border: dragActive
                            ? "1.5px dashed rgba(244,63,94,0.5)"
                            : "1px solid var(--border-default)",
                        }}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(59,130,246,0.12)" }}
                          >
                            <Upload className="w-4 h-4" style={{ color: "#3b82f6" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              Upload from Computer
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              Drag & drop or click
                            </p>
                          </div>
                        </div>

                        <div
                          className="w-full aspect-square max-w-[180px] mx-auto rounded-xl flex flex-col items-center justify-center gap-3"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1.5px dashed var(--border-default)",
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(59,130,246,0.08)" }}
                          >
                            <FileText className="w-5 h-5" style={{ color: "#3b82f6" }} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                              Drop invoice image here
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                              JPG, PNG, WEBP up to 10MB
                            </p>
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ──── STEP 2: PROCESSING ──── */}
                {step === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center py-8"
                  >
                    {processingError ? (
                      <>
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                          style={{ background: "rgba(239, 68, 68, 0.1)" }}
                        >
                          <AlertCircle className="w-7 h-7" style={{ color: "#ef4444" }} />
                        </div>
                        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                          Processing Failed
                        </h3>
                        <p className="text-sm text-center max-w-sm mb-5" style={{ color: "var(--text-muted)" }}>
                          {processingError}
                        </p>
                        <button
                          onClick={() => { setStep("upload"); setProcessingError(""); }}
                          className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Scanning Animation */}
                        <div className="relative w-32 h-32 mb-6">
                          <div
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              background: "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(168,85,247,0.08))",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            {imagePreview && (
                              <img
                                src={imagePreview}
                                alt="Invoice"
                                className="w-full h-full object-cover rounded-2xl opacity-40"
                              />
                            )}
                          </div>
                          {/* Scan line animation */}
                          <motion.div
                            className="absolute left-2 right-2 h-0.5 rounded-full"
                            style={{ background: "linear-gradient(90deg, transparent, #f43f5e, transparent)" }}
                            animate={{ top: ["10%", "90%", "10%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                          {/* Corner markers */}
                          <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 rounded-tl-md" style={{ borderColor: "#f43f5e" }} />
                          <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 rounded-tr-md" style={{ borderColor: "#f43f5e" }} />
                          <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 rounded-bl-md" style={{ borderColor: "#f43f5e" }} />
                          <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 rounded-br-md" style={{ borderColor: "#f43f5e" }} />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4" style={{ color: "#f43f5e" }} />
                          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                            Analyzing Invoice
                          </h3>
                        </div>
                        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                          AI is extracting product details from your invoice...
                        </p>

                        {/* Pulsing dots */}
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{ background: "#f43f5e" }}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* ──── STEP 3: REVIEW ──── */}
                {step === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Summary chips */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <div
                        className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                        style={{
                          background: "rgba(59,130,246,0.08)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59,130,246,0.2)",
                        }}
                      >
                        <Package className="w-3 h-3" />
                        {items.length} items detected
                      </div>
                      {conflictCount > 0 && (
                        <div
                          className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse"
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                          }}
                        >
                          <AlertCircle className="w-3 h-3" />
                          {conflictCount} {conflictCount === 1 ? "conflict" : "conflicts"} to resolve
                        </div>
                      )}
                      {updateCount > 0 && (
                        <div
                          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                          style={{
                            background: "rgba(16,185,129,0.08)",
                            color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.2)",
                          }}
                        >
                          <RefreshCw className="w-3 h-3" />
                          {updateCount} to update
                        </div>
                      )}
                      {createCount > 0 && (
                        <div
                          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                          style={{
                            background: "rgba(168,85,247,0.08)",
                            color: "#a855f7",
                            border: "1px solid rgba(168,85,247,0.2)",
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {createCount} new
                        </div>
                      )}
                    </div>

                    {/* Items Table */}
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        border: "1px solid var(--border-default)",
                        background: "var(--bg-card)",
                      }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr
                              style={{
                                borderBottom: "1px solid var(--border-subtle)",
                                background: "rgba(255,255,255,0.02)",
                              }}
                            >
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "360px" }}>
                                Product
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "120px" }}>
                                Item Code
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "130px" }}>
                                Category
                              </th>
                              <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Qty
                              </th>
                              <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Price
                              </th>
                              <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Status
                              </th>
                              <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Total
                              </th>
                              <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr
                                key={idx}
                                className="group transition-colors"
                                style={{
                                  borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                                  background:
                                    editingIndex === idx
                                      ? "rgba(244,63,94,0.04)"
                                      : "transparent",
                                }}
                              >
                                <td className="px-4 py-3">
                                  {editingIndex === idx && item.action !== "update" ? (
                                    <div className="space-y-1.5">
                                      <input
                                        className="input-field text-xs py-1.5 px-2 w-full"
                                        value={item.name}
                                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                                        placeholder="Product name"
                                      />
                                      <input
                                        className="input-field text-xs py-1.5 px-2 w-full"
                                        value={item.brand}
                                        onChange={(e) => updateItem(idx, { brand: e.target.value })}
                                        placeholder="Brand (optional)"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                        {item.name}
                                      </p>
                                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                        {item.brand || "No brand"}
                                      </p>
                                      {item.action === "conflict" && (
                                        <div className="mt-2.5 p-3 rounded-xl border text-[11px] space-y-2 text-amber-800 dark:text-amber-200"
                                          style={{
                                            background: "rgba(245, 158, 11, 0.06)",
                                            borderColor: "rgba(245, 158, 11, 0.35)",
                                            borderWidth: "1.5px"
                                          }}
                                        >
                                          <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            Similar Product Found in Inventory
                                          </p>
                                          <p className="leading-relaxed font-medium">
                                            Existing: <span className="text-gray-900 dark:text-white font-bold">{item.existingName}</span> (Cost: <span className="font-mono text-gray-900 dark:text-white font-semibold">₹{item.existingCostPrice}</span>)
                                            <br />
                                            Scanned: <span className="text-gray-900 dark:text-white font-bold">{item.name}</span> (Cost: <span className="font-mono text-gray-900 dark:text-white font-semibold">₹{item.unitPrice}</span>)
                                          </p>
                                          <div className="flex gap-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateItem(idx, {
                                                  action: "update",
                                                  name: item.existingName || item.name,
                                                  brand: item.existingBrand || item.brand,
                                                  suggestedCategories: item.existingCategory || item.suggestedCategories,
                                                  itemCode: item.existingSku || item.itemCode || "",
                                                });
                                              }}
                                              className="px-2.5 py-1 rounded-lg font-bold transition-all shadow-sm bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
                                            >
                                              Merge Stock (Existing Cost: ₹{item.existingCostPrice})
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateItem(idx, { action: "create" });
                                              }}
                                              className="px-2.5 py-1 rounded-lg font-bold transition-all border border-amber-600/40 text-amber-800 hover:bg-amber-500/10 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/10 text-[10px]"
                                            >
                                              Add as New
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  {editingIndex === idx && item.action !== "update" ? (
                                    <input
                                      className="input-field text-xs py-1.5 px-2 w-full font-mono"
                                      value={item.itemCode || ""}
                                      onChange={(e) => updateItem(idx, { itemCode: e.target.value })}
                                      placeholder="SKU / Item Code"
                                    />
                                  ) : (
                                    <code className="text-xs font-semibold px-2 py-1 rounded bg-black/10 dark:bg-white/5 border border-default tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                      {item.itemCode || "—"}
                                    </code>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                   {editingIndex === idx && item.action !== "update" ? (
                                     <div className="space-y-1.5 min-w-[120px]">
                                       {/* Pills for current categories */}
                                       <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto">
                                         {item.suggestedCategories.map((cat) => (
                                           <span
                                             key={cat}
                                             className="text-[9px] font-semibold px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-0.5"
                                           >
                                             {cat}
                                             <button
                                               type="button"
                                               onClick={() => {
                                                 updateItem(idx, {
                                                   suggestedCategories: item.suggestedCategories.filter((c) => c !== cat),
                                                 });
                                               }}
                                               className="hover:text-red-400 ml-0.5 font-bold"
                                             >
                                               ×
                                             </button>
                                           </span>
                                         ))}
                                       </div>
                                       {/* Select dropdown to pick from existing categories */}
                                       <select
                                         className="input-field text-[10px] py-1 px-1.5 w-full"
                                         style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                                         value=""
                                         onChange={(e) => {
                                           const selected = e.target.value;
                                           if (selected && !item.suggestedCategories.includes(selected)) {
                                             updateItem(idx, {
                                               suggestedCategories: [...item.suggestedCategories, selected],
                                             });
                                           }
                                         }}
                                       >
                                         <option value="" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>+ Select category</option>
                                         {allCategoriesList.map((cat) => (
                                           <option key={cat} value={cat} style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                                             {cat}
                                           </option>
                                         ))}
                                       </select>
                                     </div>
                                   ) : (
                                     <div className="flex flex-wrap gap-1">
                                       {item.suggestedCategories.length > 0 ? (
                                         item.suggestedCategories.map((c) => (
                                           <span
                                             key={c}
                                             className="text-[10px] px-1.5 py-0.5 rounded-md"
                                             style={{
                                               background: "rgba(255,255,255,0.05)",
                                               color: "var(--text-secondary)",
                                               border: "1px solid var(--border-default)",
                                             }}
                                           >
                                             {c}
                                           </span>
                                         ))
                                       ) : (
                                         <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>—</span>
                                       )}
                                     </div>
                                   )}
                                 </td>
                                <td className="px-3 py-3 text-right">
                                  {editingIndex === idx ? (
                                    <input
                                      type="number"
                                      className="input-field text-xs py-1.5 px-2 w-16 text-right"
                                      value={item.quantity}
                                      onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                                      min={0}
                                    />
                                  ) : (
                                    <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                                      {item.quantity}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {editingIndex === idx ? (
                                    <div className="space-y-1.5 min-w-[90px]">
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[9px] text-gray-500 font-medium">Price (₹)</span>
                                        <input
                                          type="number"
                                          className="input-field text-xs py-1 px-1.5 w-20 text-right"
                                          value={item.unitPrice}
                                          onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                          min={0}
                                          placeholder="Price"
                                        />
                                      </div>
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[9px] text-gray-500 font-medium">Disc (%)</span>
                                        <input
                                          type="number"
                                          className="input-field text-xs py-1 px-1.5 w-20 text-right"
                                          value={item.discount}
                                          onChange={(e) => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })}
                                          min={0}
                                          max={100}
                                          placeholder="Disc %"
                                        />
                                      </div>
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[9px] text-gray-500 font-medium">Tax (%)</span>
                                        <input
                                          type="number"
                                          className="input-field text-xs py-1 px-1.5 w-20 text-right"
                                          value={item.taxRate}
                                          onChange={(e) => updateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })}
                                          min={0}
                                          max={100}
                                          placeholder="Tax %"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                        ₹{item.unitPrice.toLocaleString("en-IN")}
                                      </span>
                                      {item.discount > 0 && (
                                        <span className="text-[10px] ml-1 text-emerald-500 font-medium">
                                          -{item.discount}%
                                        </span>
                                      )}
                                      {item.taxRate > 0 && (
                                        <span className="text-[10px] block text-amber-500 font-medium mt-0.5">
                                          +{item.taxRate}% Tax
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                   {item.action === "conflict" ? (
                                     <span
                                       className="text-[10px] font-semibold px-2 py-1 rounded-full border"
                                       style={{
                                         background: "rgba(245, 158, 11, 0.1)",
                                         borderColor: "rgba(245, 158, 11, 0.2)",
                                         color: "#f59e0b",
                                       }}
                                     >
                                       Action Required
                                     </span>
                                   ) : (
                                     <span
                                       className="text-[10px] font-semibold px-2 py-1 rounded-full"
                                       style={{
                                         background:
                                           item.action === "update"
                                             ? "rgba(16,185,129,0.1)"
                                             : "rgba(168,85,247,0.1)",
                                         color: item.action === "update" ? "#10b981" : "#a855f7",
                                       }}
                                     >
                                       {item.action === "update" ? "Update Stock" : "New Product"}
                                     </span>
                                   )}
                                   {item.action === "update" && item.existingStock !== undefined && (
                                     <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                       {item.existingStock} → {item.existingStock + item.quantity}
                                     </p>
                                   )}
                                 </td>
                                 <td className="px-3 py-3 text-right">
                                   <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                     ₹{((item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                   </span>
                                 </td>
                                 <td className="px-3 py-3 text-center">
                                   <div className="flex items-center gap-1 justify-center">
                                     {editingIndex === idx ? (
                                       <>
                                         <button
                                           onClick={() => handleSaveRow(idx)}
                                           className="btn-icon w-6 h-6"
                                           title="Save"
                                         >
                                           <Check className="w-3 h-3" style={{ color: "#10b981" }} />
                                         </button>
                                         <button
                                           onClick={() => {
                                             if (editingBackup) {
                                               setItems((prev) =>
                                                 prev.map((item, i) => (i === idx ? editingBackup : item))
                                               );
                                             }
                                             setEditingIndex(null);
                                             setEditingBackup(null);
                                           }}
                                           className="btn-icon w-6 h-6"
                                           title="Cancel"
                                         >
                                           <X className="w-3 h-3" style={{ color: "#f87171" }} />
                                         </button>
                                       </>
                                     ) : (
                                       <>
                                         <button
                                           onClick={() => {
                                             setEditingBackup({ ...item });
                                             setEditingIndex(idx);
                                           }}
                                           className="btn-icon w-6 h-6"
                                           title="Edit"
                                         >
                                           <Pencil className="w-3 h-3" />
                                         </button>
                                         <button
                                           onClick={() => removeItem(idx)}
                                           className="btn-icon w-6 h-6"
                                           title="Remove item"
                                         >
                                           <Trash2 className="w-3 h-3" style={{ color: "#f87171" }} />
                                         </button>
                                       </>
                                     )}
                                   </div>
                                 </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Grand Total Summary Bar */}
                    {items.length > 0 && (() => {
                      const calculated = items.reduce((sum, item) => {
                        return sum + (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100);
                      }, 0);
                      const grandTotal = scannedGrandTotal > 0 ? scannedGrandTotal : calculated;
                      const isFromReceipt = scannedGrandTotal > 0;
                      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                      const hasDiscount = items.some(i => (i.discount || 0) > 0);
                      const hasTax = items.some(i => (i.taxRate || 0) > 0);
                      return (
                        <div
                          className="mt-3 px-5 py-3 rounded-xl flex items-center justify-between"
                          style={{
                            background: "rgba(244,63,94,0.06)",
                            border: "1px solid rgba(244,63,94,0.18)",
                          }}
                        >
                          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{items.length}</span> item type{items.length !== 1 ? "s" : ""}</span>
                            <span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{totalQty}</span> units total</span>
                            {hasDiscount && <span className="text-emerald-400 font-medium">Discounts applied</span>}
                            {hasTax && <span className="text-cyan-400 font-medium">Tax included</span>}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                              {isFromReceipt ? "Grand Total (from receipt)" : "Grand Total (calculated)"}
                            </p>
                            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--accent-rose-light)" }}>
                              ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {processingError && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {processingError}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ──── STEP 4: SUCCESS ──── */}
                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center py-8"
                  >
                    {/* Animated checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                      style={{
                        background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
                        border: "2px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      <CheckCircle2 className="w-10 h-10" style={{ color: "#10b981" }} />
                    </motion.div>

                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Inventory Updated!
                    </h3>
                    <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                      Your products have been successfully processed
                    </p>

                    {/* Results Summary */}
                    {successResults && (
                      <div className="flex items-center gap-4 mb-6">
                        {successResults.summary.updated > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: "#10b981" }}>
                              {successResults.summary.updated}
                            </p>
                            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                              Updated
                            </p>
                          </div>
                        )}
                        {successResults.summary.created > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: "#a855f7" }}>
                              {successResults.summary.created}
                            </p>
                            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                              Created
                            </p>
                          </div>
                        )}
                        {successResults.summary.errors > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>
                              {successResults.summary.errors}
                            </p>
                            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                              Errors
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Details */}
                    {successResults?.results && (
                      <div
                        className="w-full max-w-sm rounded-xl p-3 space-y-2"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        {successResults.results.updated.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                            <span className="font-medium" style={{ color: "#10b981" }}>
                              +{item.addedStock} → {item.newStock} units
                            </span>
                          </div>
                        ))}
                        {successResults.results.created.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                            <span className="font-medium" style={{ color: "#a855f7" }}>
                              New · {item.stock} units
                            </span>
                          </div>
                        ))}
                        {successResults.results.errors.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                            <span className="font-medium" style={{ color: "#ef4444" }}>
                              {item.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div>
                {step === "review" && (
                  <button
                    onClick={() => { setStep("upload"); setItems([]); setProcessingError(""); }}
                    className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Scan Another
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {step !== "success" && (
                  <button
                    onClick={handleClose}
                    className="btn-secondary py-2 px-4 text-xs"
                  >
                    Cancel
                  </button>
                )}
                {step === "review" && items.some(i => i.action === "conflict") && (
                  <span className="text-xs text-amber-400 font-medium flex items-center gap-1 mr-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please resolve price conflicts
                  </span>
                )}
                {step === "review" && items.length > 0 && (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmLoading || items.some(i => i.action === "conflict")}
                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                    style={{
                      opacity: items.some(i => i.action === "conflict") ? 0.5 : 1,
                      cursor: items.some(i => i.action === "conflict") ? "not-allowed" : "pointer"
                    }}
                  >
                    {confirmLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Add ({items.length} items)
                      </>
                    )}
                  </button>
                )}
                {step === "success" && (
                  <button
                    onClick={handleClose}
                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    View Products
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function getStringSimilarity(s1: string, s2: string): number {
  // 1. Character bigram similarity
  const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o");
  const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o");
  
  let bigramSim = 0;
  if (str1 === str2) {
    bigramSim = 1.0;
  } else if (str1.length >= 2 && str2.length >= 2) {
    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);

    let intersection = 0;
    Array.from(bigrams1).forEach((bigram) => {
      if (bigrams2.has(bigram)) {
        intersection++;
      }
    });

    bigramSim = (2.0 * intersection) / (bigrams1.size + bigrams2.size);
  }

  // 2. Word overlap similarity
  const stopWords = new Set(["for", "the", "and", "with", "pack", "single", "size", "ml", "gm", "pcs", "free", "off", "new", "kit"]);
  const words1 = s1.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 2 && !stopWords.has(w));
  const words2 = s2.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 2 && !stopWords.has(w));

  let wordSim = 0;
  if (words1.length > 0 && words2.length > 0) {
    const set2 = new Set(words2);
    const intersect = words1.filter(w => set2.has(w)).length;
    const minLength = Math.min(words1.length, words2.length);
    wordSim = intersect / minLength;
  }

  return Math.max(bigramSim, wordSim);
}

function hasWordOverlap(s1: string, s2: string): boolean {
  const stopWords = new Set(["for", "the", "and", "with", "pack", "single", "size", "ml", "gm", "pcs", "free", "off", "new", "kit"]);
  
  const words1 = s1.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 3 && !stopWords.has(w));
  const words2 = s2.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 3 && !stopWords.has(w));
  
  const set2 = new Set(words2);
  return words1.some(word => set2.has(word));
}
