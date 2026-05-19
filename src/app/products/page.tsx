"use client";

import {
  Plus,
  Search,
  Filter,
  Package,
  TrendingDown,
  AlertTriangle,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const categories = ["All", "Hair Care", "Skin Care", "Nail Care", "Body Care", "Tools & Equipment", "Fragrances"];

const products = [
  {
    id: 1,
    name: "Kérastase Nutritive Serum",
    category: "Hair Care",
    price: 2800,
    stock: 18,
    sold: 94,
    rating: 4.9,
    status: "in-stock",
    brand: "Kérastase",
    sku: "KER-NUT-001",
    image: "K",
    color: "#f43f5e",
  },
  {
    id: 2,
    name: "L'Oreal Professionnel Masque",
    category: "Hair Care",
    price: 1950,
    stock: 25,
    sold: 78,
    rating: 4.7,
    status: "in-stock",
    brand: "L'Oreal Pro",
    sku: "LOR-MSQ-002",
    image: "L",
    color: "#a855f7",
  },
  {
    id: 3,
    name: "OPI Nail Polish Collection",
    category: "Nail Care",
    price: 850,
    stock: 8,
    sold: 134,
    rating: 4.8,
    status: "low-stock",
    brand: "OPI",
    sku: "OPI-COL-003",
    image: "O",
    color: "#fbbf24",
  },
  {
    id: 4,
    name: "Moroccanoil Treatment",
    category: "Hair Care",
    price: 3200,
    stock: 32,
    sold: 56,
    rating: 4.9,
    status: "in-stock",
    brand: "Moroccanoil",
    sku: "MOR-TRT-004",
    image: "M",
    color: "#06b6d4",
  },
  {
    id: 5,
    name: "The Ordinary Niacinamide",
    category: "Skin Care",
    price: 650,
    stock: 0,
    sold: 210,
    rating: 4.6,
    status: "out-of-stock",
    brand: "The Ordinary",
    sku: "ORD-NIA-005",
    image: "T",
    color: "#10b981",
  },
  {
    id: 6,
    name: "Dyson Airwrap Styler",
    category: "Tools & Equipment",
    price: 45000,
    stock: 5,
    sold: 12,
    rating: 5.0,
    status: "low-stock",
    brand: "Dyson",
    sku: "DYS-AIR-006",
    image: "D",
    color: "#f97316",
  },
  {
    id: 7,
    name: "Cetaphil Moisturizing Cream",
    category: "Skin Care",
    price: 480,
    stock: 60,
    sold: 187,
    rating: 4.5,
    status: "in-stock",
    brand: "Cetaphil",
    sku: "CET-MOI-007",
    image: "C",
    color: "#8b5cf6",
  },
  {
    id: 8,
    name: "Bath & Body Works Lotion",
    category: "Body Care",
    price: 1200,
    stock: 3,
    sold: 98,
    rating: 4.7,
    status: "low-stock",
    brand: "Bath & Body Works",
    sku: "BBW-LOT-008",
    image: "B",
    color: "#ec4899",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  "in-stock": { label: "In Stock", className: "badge-success" },
  "low-stock": { label: "Low Stock", className: "badge-warning" },
  "out-of-stock": { label: "Out of Stock", className: "badge-danger" },
};

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStockCount = products.filter(p => p.status === "low-stock" || p.status === "out-of-stock").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-400" />
            Products
          </h1>
          <p className="section-subtitle">{products.length} total products in inventory</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "#f43f5e", bg: "rgba(244,63,94,0.1)" },
          { label: "In Stock", value: products.filter(p => p.status === "in-stock").length, icon: Package, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
          { label: "Low / Out of Stock", value: lowStockCount, icon: AlertTriangle, color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
          { label: "Total Sold (30d)", value: products.reduce((a, p) => a + p.sold, 0), icon: TrendingDown, color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{card.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search products..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: selectedCategory === cat ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)",
                color: selectedCategory === cat ? "#fb7185" : "var(--text-muted)",
                border: selectedCategory === cat ? "1px solid rgba(244,63,94,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="btn-secondary flex-shrink-0">
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <div key={product.id} className="glass-card p-5 group relative overflow-hidden">
            {/* Menu Button */}
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
              style={{ background: "rgba(255,255,255,0.08)" }}
              onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
            >
              <MoreVertical className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>

            {/* Dropdown */}
            {openMenu === product.id && (
              <div
                className="absolute top-12 right-4 z-20 rounded-xl py-1.5 min-w-[140px]"
                style={{ background: "rgba(21,10,14,0.95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                {[
                  { label: "View", icon: Eye },
                  { label: "Edit", icon: Edit2 },
                  { label: "Delete", icon: Trash2, danger: true },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all hover:bg-white/[0.06]"
                      style={{ color: action.danger ? "#f87171" : "var(--text-secondary)" }}
                      onClick={() => setOpenMenu(null)}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product Image Placeholder */}
            <div
              className="w-full h-36 rounded-xl flex items-center justify-center text-4xl font-bold mb-4"
              style={{ background: `${product.color}15`, border: `1px solid ${product.color}20` }}
            >
              <span style={{ color: product.color }}>{product.image}</span>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {product.brand} · {product.sku}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={statusConfig[product.status].className}>
                  {statusConfig[product.status].label}
                </span>
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#fbbf24" }}>
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {product.rating}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{product.price.toLocaleString()}
                </span>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{ color: product.stock <= 5 ? "#fb7185" : "var(--text-secondary)" }}>
                    {product.stock} in stock
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{product.sold} sold</p>
                </div>
              </div>

              {/* Stock Bar */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((product.stock / 60) * 100, 100)}%`,
                    background: product.stock === 0 ? "#f43f5e" : product.stock < 10 ? "#fbbf24" : "#10b981",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
