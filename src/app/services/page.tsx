"use client";

import {
  Plus,
  Search,
  Scissors,
  Clock,
  Star,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  Zap,
  Filter,
} from "lucide-react";
import { useState } from "react";

const serviceCategories = ["All", "Hair", "Skin & Facial", "Nails", "Body & Wax", "Packages"];

const services = [
  {
    id: 1,
    name: "Hair Cut & Style",
    category: "Hair",
    duration: 45,
    price: 800,
    discountPrice: null,
    rating: 4.9,
    totalBookings: 342,
    staff: ["Maria K.", "Jana L."],
    description: "Precision cut with professional styling and blowout finish.",
    icon: "✂️",
    color: "#f43f5e",
    popular: true,
  },
  {
    id: 2,
    name: "Hair Coloring (Full)",
    category: "Hair",
    duration: 120,
    price: 4500,
    discountPrice: 3999,
    rating: 4.8,
    totalBookings: 218,
    staff: ["Maria K."],
    description: "Complete hair color transformation with premium products.",
    icon: "🎨",
    color: "#a855f7",
    popular: true,
  },
  {
    id: 3,
    name: "Deep Conditioning Treatment",
    category: "Hair",
    duration: 60,
    price: 2200,
    discountPrice: null,
    rating: 4.7,
    totalBookings: 156,
    staff: ["Maria K.", "Jana L.", "Priya S."],
    description: "Intensive moisture treatment for dry and damaged hair.",
    icon: "💧",
    color: "#06b6d4",
    popular: false,
  },
  {
    id: 4,
    name: "Classic Facial",
    category: "Skin & Facial",
    duration: 60,
    price: 1800,
    discountPrice: null,
    rating: 4.9,
    totalBookings: 289,
    staff: ["Jana L.", "Priya S."],
    description: "Deep cleansing facial with exfoliation and hydration mask.",
    icon: "✨",
    color: "#fbbf24",
    popular: true,
  },
  {
    id: 5,
    name: "Anti-Aging Facial",
    category: "Skin & Facial",
    duration: 90,
    price: 3500,
    discountPrice: null,
    rating: 4.8,
    totalBookings: 142,
    staff: ["Jana L."],
    description: "Advanced anti-aging treatment with collagen boosting.",
    icon: "⚡",
    color: "#10b981",
    popular: false,
  },
  {
    id: 6,
    name: "Gel Manicure",
    category: "Nails",
    duration: 60,
    price: 900,
    discountPrice: null,
    rating: 4.8,
    totalBookings: 412,
    staff: ["Priya S.", "Rina D."],
    description: "Long-lasting gel polish with nail shaping and cuticle care.",
    icon: "💅",
    color: "#ec4899",
    popular: true,
  },
  {
    id: 7,
    name: "Mani + Pedi Combo",
    category: "Nails",
    duration: 100,
    price: 1600,
    discountPrice: 1399,
    rating: 4.9,
    totalBookings: 298,
    staff: ["Priya S.", "Rina D."],
    description: "Complete nail care for hands and feet with gel finish.",
    icon: "🌸",
    color: "#8b5cf6",
    popular: true,
  },
  {
    id: 8,
    name: "Full Body Waxing",
    category: "Body & Wax",
    duration: 90,
    price: 2800,
    discountPrice: null,
    rating: 4.6,
    totalBookings: 187,
    staff: ["Maria K.", "Priya S."],
    description: "Smooth full body hair removal with soothing aftercare.",
    icon: "🌟",
    color: "#f97316",
    popular: false,
  },
  {
    id: 9,
    name: "Bridal Package",
    category: "Packages",
    duration: 300,
    price: 15000,
    discountPrice: 12999,
    rating: 5.0,
    totalBookings: 64,
    staff: ["Maria K.", "Jana L.", "Priya S."],
    description: "Complete bridal beauty package: hair, makeup, skin, nails.",
    icon: "👑",
    color: "#fbbf24",
    popular: true,
  },
];

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = services.filter((s) => {
    const matchCat = selectedCategory === "All" || s.category === selectedCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Scissors className="w-5 h-5 text-rose-400" />
            Services
          </h1>
          <p className="page-subtitle">{services.length} services · {services.filter(s => s.popular).length} featured</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Services", value: services.length, color: "#f43f5e", bg: "rgba(244,63,94,0.1)", icon: "🌸" },
          { label: "Total Bookings", value: services.reduce((a, s) => a + s.totalBookings, 0).toLocaleString(), color: "#a855f7", bg: "rgba(168,85,247,0.1)", icon: "📅" },
          { label: "Avg. Rating", value: (services.reduce((a, s) => a + s.rating, 0) / services.length).toFixed(1), color: "#fbbf24", bg: "rgba(251,191,36,0.1)", icon: "⭐" },
          { label: "Popular Services", value: services.filter(s => s.popular).length, color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🔥" },
        ].map((card, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{card.value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search services..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          {serviceCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="btn-secondary flex-shrink-0">
          <Filter className="w-4 h-4" />
          Sort
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className="glass-card p-5 group relative">
            {/* Popular Badge */}
            {service.popular && (
              <div
                className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                <Zap className="w-2.5 h-2.5 fill-amber-400" />
                POPULAR
              </div>
            )}

            {/* Menu Button */}
            <button
              className="btn-icon absolute top-4 right-4 w-8 h-8 opacity-0 group-hover:opacity-100"
              onClick={() => setOpenMenu(openMenu === service.id ? null : service.id)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {openMenu === service.id && (
              <div className="dropdown-menu absolute top-12 right-4 z-20">
                {[{ label: "View", icon: Eye }, { label: "Edit", icon: Edit2 }, { label: "Delete", icon: Trash2, danger: true }].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.label} onClick={() => setOpenMenu(null)} className={`dropdown-item ${(a as any).danger ? "danger" : ""}`}>
                      <Icon className="w-3.5 h-3.5" />{a.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Icon */}
            <div className="mt-8 mb-4 flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${service.color}15`, border: `1px solid ${service.color}25` }}
              >
                {service.icon}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-base font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {service.name}
                </p>
                <span
                  className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-1"
                  style={{ background: `${service.color}15`, color: service.color }}
                >
                  {service.category}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              {service.description}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {service.duration} min
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {service.rating}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {service.totalBookings} bookings
              </div>
            </div>

            {/* Staff */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {service.staff.slice(0, 3).map((staff, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                    style={{
                      background: `hsl(${i * 80 + 200}, 60%, 35%)`,
                      borderColor: "var(--bg-primary)",
                      color: "white",
                    }}
                    title={staff}
                  >
                    {staff[0]}
                  </div>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {service.staff.join(", ")}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <div>
                <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{(service.discountPrice || service.price).toLocaleString()}
                </span>
                {service.discountPrice && (
                  <span className="text-sm line-through ml-2" style={{ color: "var(--text-muted)" }}>
                    ₹{service.price.toLocaleString()}
                  </span>
                )}
              </div>
              <button className="btn-primary text-xs px-4 py-2">
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
