"use client";

import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { usePaginatedApi } from "@/hooks/useApi";

interface Product {
  id: string; name: string; category: string; brand: string;
  sku: string; price: string; stock: number; lowStockAt: number;
  status: string; isActive: boolean; createdAt: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  IN_STOCK:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "In Stock"     },
  LOW_STOCK:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Low Stock"    },
  OUT_OF_STOCK: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Out of Stock" },
};

const CATEGORIES = ["All", "Hair Care", "Skin Care", "Nail Care", "Body Care", "Tools"];

export default function ProductsPage() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [status,   setStatus]   = useState("All");
  const [page,     setPage]     = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "12" });
  if (category !== "All") params.set("category", category);
  if (status   !== "All") params.set("status",   status);
  if (search)             params.set("search",   search);

  const { data: products, pagination, loading } = usePaginatedApi<Product>(`/api/products?${params}`);

  const stats = useMemo(() => ({
    total:      pagination.total,
    lowStock:   products.filter(p => p.status === "LOW_STOCK").length,
    outOfStock: products.filter(p => p.status === "OUT_OF_STOCK").length,
    inStock:    products.filter(p => p.status === "IN_STOCK").length,
  }), [products, pagination]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Package className="w-5 h-5 text-rose-400" /> Products</h1>
          <p className="page-subtitle">{pagination.total} items across {CATEGORIES.length - 1} categories</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>
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
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search by name, brand, SKU..." className="input-field pl-10 w-full"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c); setPage(1); }}
              className={`filter-pill ${category === c ? "active" : ""}`}>{c}</button>
          ))}
        </div>
        <select className="input-field text-sm py-2 px-3" value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: "130px" }}>
          <option value="All">All Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
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
                        <td><span className="filter-pill text-xs py-1">{p.category}</span></td>
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
                            <button className="btn-icon w-7 h-7"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon w-7 h-7" style={{ color: "#f87171" }}><Trash2 className="w-3.5 h-3.5" /></button>
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
    </div>
  );
}
