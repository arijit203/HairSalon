"use client";

import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight, X, Loader2, ScanLine } from "lucide-react";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePaginatedApi } from "@/hooks/useApi";
import { useToast } from "@/context/ToastContext";
import ProductModal from "@/components/products/ProductModal";
import InvoiceScannerModal from "@/components/products/InvoiceScannerModal";
import Modal from "@/components/ui/Modal";

interface Product {
  id: string; name: string; category: string[]; brand: string;
  sku: string; price: string; costPrice?: string; stock: number; lowStockAt: number;
  status: string; isActive: boolean; createdAt: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  IN_STOCK:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "In Stock"     },
  LOW_STOCK:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Low Stock"    },
  OUT_OF_STOCK: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Out of Stock" },
};

function ProductsPageContent() {
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();
  const [search,   setSearch]   = useState(searchParams.get("search") || "");

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearch(s);
    }
  }, [searchParams]);

  const [category, setCategory] = useState("All");
  const [status,   setStatus]   = useState(searchParams.get("status") || "All");
  const [page,     setPage]     = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Modal and editing states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isInvoiceScannerOpen, setIsInvoiceScannerOpen] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Delete Category states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [servicesToDelete, setServicesToDelete] = useState<string[]>([]);
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: "12" });
  if (category !== "All") params.set("category", category);
  if (status   !== "All") params.set("status",   status);
  if (search)             params.set("search",   search);

  const { data: products, pagination, loading, refetch } = usePaginatedApi<Product>(`/api/products?${params}`);

  // Fetch unique categories currently in the DB
  useEffect(() => {
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          const cats = d.data.flatMap((p: any) => p.category);
          const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
          setDynamicCategories(uniqueCats.sort());
        }
      })
      .catch((err) => console.error("Error loading categories:", err));

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
  }, [products]);

  // Fetch all products matching current category and search to compute stats
  useEffect(() => {
    const statsParams = new URLSearchParams();
    statsParams.set("limit", "1000");
    if (category !== "All") statsParams.set("category", category);
    if (search) statsParams.set("search", search);

    fetch(`/api/products?${statsParams}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setAllProducts(d.data);
        }
      })
      .catch((err) => console.error("Error loading all products for stats:", err));
  }, [category, search, products]);

  // Load custom categories from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Fetch admin role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setIsAdmin(d.data.roleType === "staff" && d.data.staffRole === "ADMIN");
        }
      })
      .catch(() => {});
  }, []);

  // Trigger modals from URL parameters (useful for opening in a new tab/window)
  useEffect(() => {
    const openAddProduct = searchParams.get("openAddProduct");
    const openScanner = searchParams.get("openScanner");
    if (openAddProduct === "true") {
      setIsModalOpen(true);
    }
    if (openScanner === "true") {
      setIsInvoiceScannerOpen(true);
    }
  }, [searchParams]);

  const handleTriggerDeleteCategory = async (cat: string) => {
    setCategoryToDelete(cat);
    
    // Fetch services under this category
    try {
      const res = await fetch(`/api/services?limit=100`);
      const d = await res.json();
      if (d.data) {
        const servicesInCat = d.data.filter((s: any) => s.category === cat);
        setServicesToDelete(servicesInCat.map((s: any) => s.name));
      } else {
        setServicesToDelete([]);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setServicesToDelete([]);
    }

    // Fetch products under this category
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(cat)}&limit=100`);
      const data = await res.json();
      if (res.ok && data.data) {
        setProductsToDelete(data.data.map((p: any) => p.name));
      } else {
        setProductsToDelete([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProductsToDelete([]);
    }
    
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteCategory = async () => {
    setDeletingCategory(true);
    try {
      const res = await fetch(`/api/categories?category=${encodeURIComponent(categoryToDelete)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete category");
      }

      const updated = customCategories.filter(c => c !== categoryToDelete);
      setCustomCategories(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("wyapar_custom_categories", JSON.stringify(updated));
      }

      success(`Category "${categoryToDelete}" deleted successfully.`);
      setCategory("All");
      setIsDeleteModalOpen(false);
      
      // Refetch products and categories
      refetch();
      
      // Refetch dynamic and service categories
      fetch("/api/products?limit=100")
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            const cats = d.data.flatMap((p: any) => p.category);
            const uniqueCats = Array.from(new Set(cats)).filter(Boolean) as string[];
            setDynamicCategories(uniqueCats.sort());
          }
        })
        .catch((err) => console.error("Error loading categories:", err));

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
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while deleting the category.");
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toastError(`Category "${trimmed}" already exists.`);
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("wyapar_custom_categories", JSON.stringify(updated));
    }
    setCategory(trimmed);
    setNewCategoryName("");
    setIsAddCategoryModalOpen(false);
    success(`Category "${trimmed}" added!`);
  };

  const allCategories = useMemo(() => {
    const defaultCats = ["Hair Care", "Skin Care", "Nail Care", "Body Care", "Packages", "Tools", "Spa"];
    const activeCats = dynamicCategories.concat(serviceCategories).filter(Boolean);
    // Only include default categories if they have active services or products
    const defaultCatsWithContent = defaultCats.filter(cat => 
      activeCats.includes(cat) || dynamicCategories.includes(cat)
    );
    const merged = Array.from(new Set([...defaultCatsWithContent, ...dynamicCategories, ...serviceCategories, ...customCategories]));
    return ["All", ...merged];
  }, [dynamicCategories, serviceCategories, customCategories]);

  const stats = useMemo(() => {
    const total = allProducts.length;
    const inStock = allProducts.filter(p => p.status === "IN_STOCK").length;
    const lowStock = allProducts.filter(p => p.status === "LOW_STOCK").length;
    const outOfStock = allProducts.filter(p => p.status === "OUT_OF_STOCK").length;
    return { total, inStock, lowStock, outOfStock };
  }, [allProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete product");
      }
      success("Product deleted successfully");
      refetch();
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while deleting the product.");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Package className="w-5 h-5 text-rose-400" /> Products</h1>
          <p className="page-subtitle">{pagination.total} items across {allCategories.length - 1} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsInvoiceScannerOpen(true)}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
          >
            <ScanLine className="w-4 h-4" /> Scan Invoice
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { statusVal: "All",          label: "Total Items",   value: stats.total,      color: "#6b7280", activeBorder: "var(--border-total-active)", activeShadow: "0 0 12px var(--border-total-active)", activeBg: "var(--bg-total-active)", icon: Package },
          { statusVal: "IN_STOCK",     label: "In Stock",      value: stats.inStock,    color: "#10b981", activeBorder: "#10b981", activeShadow: "0 0 12px rgba(16,185,129,0.2)", activeBg: "rgba(16,185,129,0.05)", icon: Package },
          { statusVal: "LOW_STOCK",     label: "Low Stock",     value: stats.lowStock,   color: "#f59e0b", activeBorder: "#f59e0b", activeShadow: "0 0 12px rgba(245,158,11,0.2)", activeBg: "rgba(245,158,11,0.05)", icon: AlertTriangle },
          { statusVal: "OUT_OF_STOCK",  label: "Out of Stock",  value: stats.outOfStock, color: "#ef4444", activeBorder: "#ef4444", activeShadow: "0 0 12px rgba(239,68,68,0.2)", activeBg: "rgba(239,68,68,0.05)", icon: TrendingDown },
        ].map(s => {
          const Icon = s.icon;
          const isActive = status === s.statusVal;
          return (
            <div 
              key={s.label} 
              onClick={() => { setStatus(s.statusVal); setPage(1); }}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                border: isActive 
                  ? `1.5px solid ${s.activeBorder}` 
                  : "1px solid var(--border-default)",
                boxShadow: isActive 
                  ? s.activeShadow 
                  : "none",
                background: isActive 
                  ? s.activeBg 
                  : "var(--bg-card)",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search by name, brand, SKU..." className="input-field pl-10 w-full"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 py-1 pr-2 overflow-x-auto w-full">
            {allCategories.map((c) => {
              const isAll = c === "All";
              const isActive = category === c;
              return (
                <div
                  key={c}
                  onClick={() => { setCategory(c); setPage(1); }}
                  className={`filter-pill flex items-center gap-1.5 cursor-pointer group relative inline-flex flex-shrink-0 ${
                    isActive ? "active" : ""
                  } ${!isAll ? "px-4" : ""}`}
                >
                  <span>{c}</span>
                  {!isAll && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerDeleteCategory(c);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-gray-500 transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-default)",
                      }}
                      title="Delete category"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {/* Add Category Pill */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setNewCategoryName("");
                  setIsAddCategoryModalOpen(true);
                }}
                className="filter-pill flex items-center justify-center w-7 h-7 rounded-full p-0 flex-shrink-0 hover:bg-white/[0.08] inline-flex"
                title="Add Category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>SKU</th>
                <th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(7).fill(0).map((_, j) => (
                        <td key={j}><div className="h-4 rounded bg-white/[0.06] w-full" /></td>
                      ))}
                    </tr>
                  ))
                : products.map(p => {
                    const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.IN_STOCK;
                    return (
                      <tr key={p.id} className="group">
                        <td>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{p.brand}</p>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {p.category.map(c => (
                              <span key={c} className="filter-pill text-[10px] py-0.5 px-2 bg-white/[0.04] text-[var(--text-secondary)]">{c}</span>
                            ))}
                          </div>
                        </td>
                        <td><code className="text-xs" style={{ color: "var(--text-muted)" }}>{p.sku}</code></td>
                        <td>
                          <div>
                            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>₹{Number(p.price).toLocaleString("en-IN")}</span>
                            {p.costPrice && Number(p.costPrice) > 0 && (
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                Avg Cost: ₹{Number(p.costPrice).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.stock / (p.lowStockAt * 5)) * 100)}%`, background: st.color }} />
                            </div>
                            <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>{p.stock}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                              className="btn-icon w-7 h-7"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id, p.name)}
                              className="btn-icon w-7 h-7" 
                              style={{ color: "#f87171" }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Showing {(page - 1) * 12 + 1}–{Math.min(page * 12, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-icon w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{page} / {pagination.totalPages}</span>
              <button className="btn-icon w-8 h-8" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={refetch}
        editingProduct={editingProduct}
      />

      <InvoiceScannerModal
        open={isInvoiceScannerOpen}
        onClose={() => setIsInvoiceScannerOpen(false)}
        onProductsUpdated={refetch}
      />

      {/* Delete Category Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Category"
        subtitle={`Are you sure you want to delete the category "${categoryToDelete}"?`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary py-2 px-4 text-xs"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deletingCategory}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary py-2 px-4 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDeleteCategory}
              disabled={deletingCategory}
            >
              {deletingCategory ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-3 py-2 text-sm text-[var(--text-secondary)]">
          <p>
            Deleting this category will have the following effects:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-[var(--text-muted)]">
            <li>
              <strong>Services ({servicesToDelete.length}):</strong>
              {servicesToDelete.length > 0 ? (
                <div className="mt-1 pl-3 text-[11px] text-[var(--text-muted)] max-h-[80px] overflow-y-auto space-y-0.5 border-l border-zinc-200 dark:border-white/10">
                  {servicesToDelete.map((name) => (
                    <div key={name}>• {name}</div>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)] ml-1.5">None</span>
              )}
            </li>
            <li>
              <strong>Products ({productsToDelete.length}):</strong>
              {productsToDelete.length > 0 ? (
                <div className="mt-1 pl-3 text-[11px] text-[var(--text-muted)] max-h-[80px] overflow-y-auto space-y-0.5 border-l border-zinc-200 dark:border-white/10">
                  {productsToDelete.map((name) => (
                    <div key={name}>• {name}</div>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)] ml-1.5">None</span>
              )}
            </li>
          </ul>
          <div className="text-xs text-red-500 font-medium flex items-start gap-1.5 mt-2">
            <span>⚠️</span>
            <span>Warning: Services will be deleted, but products will only have this category removed.</span>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        open={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Add New Category"
        subtitle="Create a custom category to group your salon products"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary py-2 px-4 text-xs"
              onClick={() => setIsAddCategoryModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary py-2 px-4 text-xs"
              onClick={handleAddCategory}
            >
              Add Category
            </button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Styling, Hair Care, Skin Care"
              className="input-field"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              autoFocus
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-rose)]" /></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
