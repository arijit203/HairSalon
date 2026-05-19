"use client";

import {
  Plus, Search, Filter, Package, TrendingDown,
  AlertTriangle, Star, MoreVertical, Edit2, Trash2, Eye, ChevronDown,
} from "lucide-react";
import { useState } from "react";

const categories = ["All", "Hair Care", "Skin Care", "Nail Care", "Body Care", "Tools & Equipment"];

const products = [
  { id: 1, name: "Kérastase Nutritive Serum",    category: "Hair Care",       price: 2800,  stock: 18, sold: 94,  rating: 4.9, status: "in-stock",    brand: "Kérastase",   sku: "KER-001", letter: "K", color: "#f43f5e" },
  { id: 2, name: "L'Oreal Professionnel Masque", category: "Hair Care",       price: 1950,  stock: 25, sold: 78,  rating: 4.7, status: "in-stock",    brand: "L'Oreal Pro", sku: "LOR-002", letter: "L", color: "#a855f7" },
  { id: 3, name: "OPI Nail Polish Collection",   category: "Nail Care",       price: 850,   stock: 8,  sold: 134, rating: 4.8, status: "low-stock",   brand: "OPI",         sku: "OPI-003", letter: "O", color: "#fbbf24" },
  { id: 4, name: "Moroccanoil Treatment",        category: "Hair Care",       price: 3200,  stock: 32, sold: 56,  rating: 4.9, status: "in-stock",    brand: "Moroccanoil", sku: "MOR-004", letter: "M", color: "#06b6d4" },
  { id: 5, name: "The Ordinary Niacinamide",     category: "Skin Care",       price: 650,   stock: 0,  sold: 210, rating: 4.6, status: "out-of-stock",brand: "The Ordinary",sku: "ORD-005", letter: "T", color: "#10b981" },
  { id: 6, name: "Dyson Airwrap Styler",         category: "Tools & Equipment",price: 45000, stock: 5, sold: 12,  rating: 5.0, status: "low-stock",   brand: "Dyson",       sku: "DYS-006", letter: "D", color: "#f97316" },
  { id: 7, name: "Cetaphil Moisturizing Cream",  category: "Skin Care",       price: 480,   stock: 60, sold: 187, rating: 4.5, status: "in-stock",    brand: "Cetaphil",    sku: "CET-007", letter: "C", color: "#8b5cf6" },
  { id: 8, name: "Bath & Body Works Lotion",     category: "Body Care",       price: 1200,  stock: 3,  sold: 98,  rating: 4.7, status: "low-stock",   brand: "Bath & Body", sku: "BBW-008", letter: "B", color: "#ec4899" },
];

const statusConfig: Record<string, { label: string; badge: string }> = {
  "in-stock":    { label: "In Stock",    badge: "badge-success" },
  "low-stock":   { label: "Low Stock",   badge: "badge-warning" },
  "out-of-stock":{ label: "Out of Stock",badge: "badge-danger"  },
};

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [openMenu,         setOpenMenu]         = useState<number | null>(null);

  const filtered = products.filter(p => {
    const matchCat    = selectedCategory === "All" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStockCount = products.filter(p => p.status !== "in-stock").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-400" />
            Products
          </h1>
          <p className="page-subtitle">{products.length} products in inventory</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length,       icon: Package,       color: "#f43f5e" },
          { label: "In Stock",       value: products.filter(p => p.status === "in-stock").length, icon: Package, color: "#10b981" },
          { label: "Low / Out Stock",value: lowStockCount,         icon: AlertTriangle,  color: "#fbbf24" },
          { label: "Units Sold",     value: products.reduce((a,p) => a + p.sold, 0), icon: TrendingDown, color: "#a855f7" },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${c.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{c.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search products…" className="input-field pl-10"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}>
              {cat}
            </button>
          ))}
        </div>
        <button className="btn-secondary flex-shrink-0">
          <Filter className="w-4 h-4" /> Filter <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(product => (
          <div key={product.id} className="glass-card p-5 group relative overflow-visible">

            {/* Menu */}
            <button
              onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
              className="absolute top-4 right-4 btn-icon w-8 h-8 opacity-0 group-hover:opacity-100 z-10"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {openMenu === product.id && (
              <div className="dropdown-menu absolute top-12 right-4 z-20">
                {[{ label:"View",  icon:Eye  },{ label:"Edit",  icon:Edit2 },{ label:"Delete",icon:Trash2,danger:true }].map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.label} className={`dropdown-item ${(a as any).danger ? "danger" : ""}`} onClick={() => setOpenMenu(null)}>
                      <Icon className="w-3.5 h-3.5" />{a.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Image */}
            <div className="w-full h-32 rounded-xl flex items-center justify-center text-4xl font-bold mb-4"
              style={{ background: `${product.color}12`, border: `1px solid ${product.color}20` }}>
              <span style={{ color: product.color }}>{product.letter}</span>
            </div>

            {/* Info */}
            <p className="text-sm font-semibold leading-snug mb-0.5 truncate" style={{ color: "var(--text-primary)" }}>
              {product.name}
            </p>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              {product.brand} · {product.sku}
            </p>

            <div className="flex items-center justify-between mb-3">
              <span className={statusConfig[product.status].badge}>{statusConfig[product.status].label}</span>
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: "#fbbf24" }}>
                <Star className="w-3.5 h-3.5 fill-amber-400" />{product.rating}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{product.price.toLocaleString()}
              </span>
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: product.stock <= 5 ? "#f43f5e" : "var(--text-secondary)" }}>
                  {product.stock} in stock
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{product.sold} sold</p>
              </div>
            </div>

            {/* Stock bar */}
            <div className="progress-bar mt-2.5">
              <div className="progress-fill" style={{
                width: `${Math.min((product.stock / 60) * 100, 100)}%`,
                background: product.stock === 0 ? "#f43f5e" : product.stock < 10 ? "#fbbf24" : "#10b981",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
