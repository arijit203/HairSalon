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
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { usePaginatedApi } from "@/hooks/useApi";
import { useToast } from "@/context/ToastContext";
import { useBooking } from "@/context/BookingContext";
import ServiceModal from "@/components/services/ServiceModal";

const serviceCategories = ["All", "Hair", "Skin & Facial", "Nails", "Body & Wax", "Packages"];

const mapCategoryToEmoji = (cat: string) => {
  switch (cat.toLowerCase()) {
    case "hair":
      return "✂️";
    case "skin & facial":
      return "✨";
    case "nails":
      return "💅";
    case "body & wax":
      return "🌟";
    case "packages":
      return "👑";
    default:
      return "✂️";
  }
};

const mapCategoryToColor = (cat: string) => {
  switch (cat.toLowerCase()) {
    case "hair":
      return "#f43f5e";
    case "skin & facial":
      return "#fbbf24";
    case "nails":
      return "#ec4899";
    case "body & wax":
      return "#f97316";
    case "packages":
      return "#8b5cf6";
    default:
      return "#a855f7";
  }
};

export default function ServicesPage() {
  const { success, error: toastError } = useToast();
  const { openBooking } = useBooking();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch services from DB
  const [tick, setTick] = useState(0);
  const { data: dbServices, loading, refetch } = usePaginatedApi<any>(
    `/api/services?limit=100&_t=${tick}`
  );

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

  // Map database services to UI structure
  const mappedServices = useMemo(() => {
    return dbServices.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      duration: s.duration,
      price: Number(s.price),
      discountPrice: s.discountPrice ? Number(s.discountPrice) : null,
      rating: 4.8, // Default rating as it's not a direct column in the DB
      totalBookings: s._count?.appointments ?? 0,
      staff: s.staffServices?.map((ss: any) => ss.staff?.name).filter(Boolean) || [],
      description: s.description || "",
      icon: mapCategoryToEmoji(s.category),
      color: mapCategoryToColor(s.category),
      popular: s.isPopular,
      raw: s,
    }));
  }, [dbServices]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return mappedServices.filter((s) => {
      const matchCat = selectedCategory === "All" || s.category === selectedCategory;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [mappedServices, selectedCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalServices = dbServices.length;
    const totalBookings = dbServices.reduce((acc, s) => acc + (s._count?.appointments ?? 0), 0);
    const popularCount = dbServices.filter((s) => s.isPopular).length;
    return {
      totalServices,
      totalBookings,
      popularCount,
    };
  }, [dbServices]);

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete service");
      }
      success("Service deleted successfully!");
      setTick((t) => t + 1);
    } catch (err: any) {
      toastError(err.message ?? "An error occurred.");
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: any) => {
    setEditingService(service.raw);
    setIsModalOpen(true);
    setOpenMenu(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Scissors className="w-5 h-5 text-rose-400" />
            Services
          </h1>
          <p className="page-subtitle">
            {stats.totalServices} services · {stats.popularCount} featured
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Services", value: stats.totalServices, color: "#f43f5e", bg: "rgba(244,63,94,0.1)", icon: "🌸" },
          { label: "Total Bookings", value: stats.totalBookings.toLocaleString(), color: "#a855f7", bg: "rgba(168,85,247,0.1)", icon: "📅" },
          { label: "Avg. Rating", value: "4.8", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", icon: "⭐" },
          { label: "Popular Services", value: stats.popularCount, color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🔥" },
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
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse space-y-4">
              <div className="h-6 w-32 bg-white/[0.06] rounded" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/[0.06] rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 glass-card p-8 text-center">
          <Scissors className="w-12 h-12 text-[var(--text-muted)] mb-3 opacity-30 animate-bounce" />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No services found matching the criteria.
          </p>
          {isAdmin && (
            <button className="btn-primary mt-4 text-xs px-4 py-2" onClick={handleOpenAddModal}>
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <div key={service.id} className="glass-card p-5 group relative flex flex-col justify-between">
              <div>
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

                {/* Menu Button (Admin only) */}
                {isAdmin && (
                  <>
                    <button
                      className="btn-icon absolute top-4 right-4 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setOpenMenu(openMenu === service.id ? null : service.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenu === service.id && (
                      <div className="dropdown-menu absolute top-12 right-4 z-20">
                        {[
                          { label: "Edit", icon: Edit2, onClick: () => handleOpenEditModal(service) },
                          { label: "Delete", icon: Trash2, danger: true, onClick: () => handleDelete(service.id) },
                        ].map((a) => {
                          const Icon = a.icon;
                          return (
                            <button
                              key={a.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                a.onClick();
                              }}
                              className={`dropdown-item ${(a as any).danger ? "danger" : ""}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Icon */}
                <div className="mt-8 mb-4 flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 animate-fade-in"
                    style={{ background: `${service.color}15`, border: `1px solid ${service.color}25` }}
                  >
                    {service.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-base font-semibold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
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

                <p className="text-xs leading-relaxed mb-4 line-clamp-2 h-8" style={{ color: "var(--text-muted)" }}>
                  {service.description || "No description provided."}
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
                <div className="flex items-center gap-2 mb-4 h-7">
                  {service.staff.length > 0 ? (
                    <>
                      <div className="flex -space-x-2">
                        {service.staff.slice(0, 3).map((staff: string, i: number) => (
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
                      <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                        {service.staff.join(", ")}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                      No staff assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Book */}
              <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div>
                  <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    ₹{(service.discountPrice || service.price).toLocaleString("en-IN")}
                  </span>
                  {service.discountPrice && (
                    <span className="text-sm line-through ml-2" style={{ color: "var(--text-muted)" }}>
                      ₹{service.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <button
                  className="btn-primary text-xs px-4 py-2"
                  onClick={() => openBooking({ defaultDate: undefined })}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      <ServiceModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => setTick((t) => t + 1)}
        editingService={editingService}
      />
    </div>
  );
}
