"use client";

import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { usePaginatedApi } from "@/hooks/useApi";
import { useToast } from "@/context/ToastContext";
import ProductModal from "@/components/products/ProductModal";
import Modal from "@/components/ui/Modal";

interface Product {
  id: string; name: string; category: string[]; brand: string;
  sku: string; price: string; stock: number; lowStockAt: number;
  status: string; isActive: boolean; createdAt: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  IN_STOCK:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "In Stock"     },
  LOW_STOCK:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Low Stock"    },
  OUT_OF_STOCK: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Out of Stock" },
};

export default function ProductsPage() {
  const { success, error: toastError } = useToast();
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [status,   setStatus]   = useState("All");
  const [page,     setPage]     = useState(1);

  // Modal and editing states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Delete Category states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [servicesToDeleteCount, setServicesToDeleteCount] = useState(0);
  const [productsToDeleteCount, setProductsToDeleteCount] = useState(0);
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

  const handleTriggerDeleteCategory = async (cat: string) => {
    setCategoryToDelete(cat);
    
    // Count associated services from DB
    try {
      const res = await fetch(`/api/services?limit=100`);
      const d = await res.json();
      if (d.data) {
        const sCount = d.data.filter((s: any) => s.category === cat).length;
        setServicesToDeleteCount(sCount);
      } else {
        setServicesToDeleteCount(0);
      }
    } catch (err) {
      console.error("Error fetching services count:", err);
      setServicesToDeleteCount(0);
    }

    // Count associated products from DB
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(cat)}&limit=1`);
      const data = await res.json();
      if (res.ok && data.pagination) {
        setProductsToDeleteCount(data.pagination.total || 0);
      } else {
        setProductsToDeleteCount(0);
      }
    } catch (err) {
      console.error("Error fetching product count:", err);
      setProductsToDeleteCount(0);
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
      refetch();
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while deleting the category.");
    } finally {
      setDeletingCategory(false);
    }
  };

  const allCategories = useMemo(() => {
    const defaultCats = ["Hair Care", "Skin Care", "Nail Care", "Body Care", "Packages", "Tools", "Spa"];
    const merged = Array.from(new Set([...defaultCats, ...dynamicCategories, ...serviceCategories, ...customCategories]));
    return ["All", ...merged];
  }, [dynamicCategories, serviceCategories, customCategories]);

  const stats = useMemo(() => ({
    total:      pagination.total,
    lowStock:   products.filter(p => p.status === "LOW_STOCK").length,
    outOfStock: products.filter(p => p.status === "OUT_OF_STOCK").length,
    inStock:    products.filter(p => p.status === "IN_STOCK").length,
  }), [products, pagination]);

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
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items",   value: pagination.total,   color: "#f43f5e", icon: Package },
          { label: "In Stock",      value: stats.inStock,      color: "#10b981", icon: Package },
          { label: "Low Stock",     value: stats.lowStock,     color: "#f59e0b", icon: AlertTriangle },
          { label: "Out of Stock",  value: stats.outOfStock,   color: "#ef4444", icon: TrendingDown },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
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
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search by name, brand, SKU..." className="input-field pl-10 w-full"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((c) => {
              const isAll = c === "All";
              const isActive = category === c;
              return (
                <div
                  key={c}
                  onClick={() => { setCategory(c); setPage(1); }}
                  className={`filter-pill flex items-center gap-1.5 cursor-pointer ${
                    isActive ? "active" : ""
                  } ${!isAll ? "pl-4 pr-2.5" : ""}`}
                >
                  <span>{c}</span>
                  {!isAll && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerDeleteCategory(c);
                      }}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-start">
          <select className="input-field text-sm cursor-pointer" value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            style={{ 
              width: "135px",
              borderColor: "rgba(244, 63, 94, 0.25)",
              boxShadow: "0 0 0 1px rgba(244, 63, 94, 0.05)"
            }}>
            <option value="All" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>All Status</option>
            <option value="IN_STOCK" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>In Stock</option>
            <option value="LOW_STOCK" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Low Stock</option>
            <option value="OUT_OF_STOCK" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Out of Stock</option>
          </select>
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
                        <td><span className="font-semibold" style={{ color: "var(--text-primary)" }}>₹{Number(p.price).toLocaleString("en-IN")}</span></td>
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
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-muted)]">
            <li>
              <strong>Services:</strong> {servicesToDeleteCount} service(s) under this category will be permanently removed.
            </li>
            <li>
              <strong>Products:</strong> {productsToDeleteCount} product(s) associated with this category will be removed from inventory.
            </li>
          </ul>
          <p className="text-xs text-red-500 font-medium">
            ⚠️ Warning: This action is permanent and cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
