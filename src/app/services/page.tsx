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
  Check,
  X,
  Calendar,
  Flame,
  Paintbrush,
  Heart,
  Crown,
  Wrench,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { usePaginatedApi } from "@/hooks/useApi";
import { useToast } from "@/context/ToastContext";
import { useBooking } from "@/context/BookingContext";
import ServiceModal from "@/components/services/ServiceModal";
import Modal from "@/components/ui/Modal";

const serviceCategories = ["All", "Hair Care", "Skin Care", "Nail Care", "Body Care", "Packages", "Tools", "Spa"];

const mapCategoryToIcon = (cat: string): LucideIcon => {
  switch (cat.toLowerCase()) {
    case "hair":
    case "hair care":
      return Scissors;
    case "skin & facial":
    case "skin care":
      return Sparkles;
    case "nails":
    case "nail care":
      return Paintbrush;
    case "body & wax":
    case "body care":
      return Heart;
    case "packages":
      return Crown;
    case "tools":
      return Wrench;
    case "spa":
      return Smile;
    default:
      return Scissors;
  }
};

const mapCategoryToColor = (cat: string) => {
  switch (cat.toLowerCase()) {
    case "hair":
    case "hair care":
      return "#f43f5e";
    case "skin & facial":
    case "skin care":
      return "#fbbf24";
    case "nails":
    case "nail care":
      return "#ec4899";
    case "body & wax":
    case "body care":
      return "#f97316";
    case "packages":
      return "#8b5cf6";
    case "tools":
      return "#3b82f6";
    case "spa":
      return "#06b6d4";
    default:
      return "#a855f7";
  }
};

export default function ServicesPage() {
  const { success, error: toastError } = useToast();
  const { openBooking } = useBooking();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statsFilter, setStatsFilter] = useState("All");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  // Delete Category states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [servicesToDelete, setServicesToDelete] = useState<string[]>([]);
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [deletingCategory, setDeletingCategory] = useState(false);
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch services from DB
  const [tick, setTick] = useState(0);
  const { data: dbServices, loading, refetch } = usePaginatedApi<any>(
    `/api/services?limit=100&_t=${tick}`
  );

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

  const [productCategories, setProductCategories] = useState<string[]>([]);

  // Fetch unique product categories to show them on the services page filter
  useEffect(() => {
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
  }, [tick]);

  // Dynamic categories list including defaults, database entries, and custom ones
  const categoriesList = useMemo(() => {
    const defaultCats = ["Hair Care", "Skin Care", "Nail Care", "Body Care", "Packages", "Tools", "Spa"];
    const activeCats = dbServices.map((s: any) => s.category).filter(Boolean);
    // Only include default categories if they have active services or products
    const defaultCatsWithContent = defaultCats.filter(cat => 
      activeCats.includes(cat) || productCategories.includes(cat)
    );
    const merged = Array.from(new Set([...defaultCatsWithContent, ...activeCats, ...productCategories, ...customCategories]));
    return ["All", ...merged.filter(c => c !== "All")];
  }, [dbServices, productCategories, customCategories]);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categoriesList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toastError(`Category "${trimmed}" already exists.`);
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("wyapar_custom_categories", JSON.stringify(updated));
    }
    setSelectedCategory(trimmed);
    setNewCategoryName("");
    setIsAddCategoryModalOpen(false);
    success(`Category "${trimmed}" added!`);
  };

  const handleTriggerDeleteCategory = async (cat: string) => {
    setCategoryToDelete(cat);
    
    // Services under this category
    const servicesInCat = dbServices.filter((s: any) => s.category === cat);
    setServicesToDelete(servicesInCat.map((s: any) => s.name));

    // Products under this category
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
      setSelectedCategory("All");
      setIsDeleteModalOpen(false);
      
      // Refetch services and product categories
      setTick((t) => t + 1);
      
      // Refetch product categories
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
    } catch (err: any) {
      toastError(err.message ?? "An error occurred while deleting the category.");
    } finally {
      setDeletingCategory(false);
    }
  };

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
    return dbServices.map((s: any) => {
      const uniqueClients = new Set((s.appointments || []).map((a: any) => a.clientId));
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        price: Number(s.price),
        discountPrice: s.discountPrice ? Number(s.discountPrice) : null,
        rating: 4.8, // Default rating as it's not a direct column in the DB
        totalBookings: uniqueClients.size,
        staff: s.staffServices?.map((ss: any) => ss.staff?.name).filter(Boolean) || [],
        description: s.description || "",
        icon: mapCategoryToIcon(s.category),
        color: mapCategoryToColor(s.category),
        popular: s.isPopular,
        raw: s,
      };
    });
  }, [dbServices]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return mappedServices.filter((s) => {
      const matchCat = selectedCategory === "All" || s.category === selectedCategory;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
      let matchStats = true;
      if (statsFilter === "Bookings") {
        matchStats = s.totalBookings > 0;
      } else if (statsFilter === "Rating") {
        matchStats = s.rating >= 4.8;
      } else if (statsFilter === "Popular") {
        matchStats = s.popular === true;
      }
      return matchCat && matchSearch && matchStats;
    });
  }, [mappedServices, selectedCategory, searchQuery, statsFilter]);

  // Statistics
  const statsBase = useMemo(() => {
    return mappedServices.filter((s) => {
      const matchCat = selectedCategory === "All" || s.category === selectedCategory;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [mappedServices, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const totalServices = statsBase.length;
    const totalBookings = statsBase.reduce((acc, s) => acc + s.totalBookings, 0);
    const popularCount = statsBase.filter((s) => s.popular).length;
    return {
      totalServices,
      totalBookings,
      popularCount,
    };
  }, [statsBase]);

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
            {filtered.length} services shown · {stats.popularCount} featured
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
          { statusVal: "All",      label: "Total Services", value: stats.totalServices, color: "#f43f5e", activeBorder: "var(--border-total-active)", activeShadow: "0 0 12px var(--border-total-active)", activeBg: "var(--bg-total-active)", icon: Scissors },
          { statusVal: "Bookings", label: "Total Bookings", value: stats.totalBookings.toLocaleString(), color: "#a855f7", activeBorder: "#a855f7", activeShadow: "0 0 12px rgba(168,85,247,0.2)", activeBg: "rgba(168,85,247,0.05)", icon: Calendar },
          { statusVal: "Rating",   label: "Avg. Rating",    value: "4.8", color: "#fbbf24", activeBorder: "#fbbf24", activeShadow: "0 0 12px rgba(251,191,36,0.2)", activeBg: "rgba(251,191,36,0.05)", icon: Star },
          { statusVal: "Popular",  label: "Popular Services", value: stats.popularCount, color: "#10b981", activeBorder: "#10b981", activeShadow: "0 0 12px rgba(16,185,129,0.2)", activeBg: "rgba(16,185,129,0.05)", icon: Flame },
        ].map(s => {
          const Icon = s.icon;
          const isActive = statsFilter === s.statusVal;
          return (
            <div 
              key={s.label} 
              onClick={() => setStatsFilter(s.statusVal)}
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
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 max-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search services..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 py-1 pr-2 overflow-x-auto w-full">
            {categoriesList.map((cat) => {
              const isAll = cat === "All";
              const isActive = selectedCategory === cat;
              return (
                <div
                  key={cat}
                  className={`filter-pill flex items-center gap-1.5 cursor-pointer group relative inline-flex flex-shrink-0 ${
                    isActive ? "active" : ""
                  } ${!isAll ? "px-4" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>{cat}</span>
                  {!isAll && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerDeleteCategory(cat);
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
                      className="btn-icon absolute top-4 right-4 w-8 h-8 transition-opacity"
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
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 animate-fade-in"
                    style={{ background: `${service.color}15`, border: `1px solid ${service.color}25` }}
                  >
                    <service.icon className="w-6 h-6" style={{ color: service.color }} />
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

                <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
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
                {service.staff.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 h-7">
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
                  </div>
                )}
              </div>

              {/* Price */}
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
        extraCategories={categoriesList.filter(c => c !== "All")}
        defaultCategory={selectedCategory !== "All" ? selectedCategory : undefined}
      />

      {/* Add Category Modal */}
      <Modal
        open={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Add New Category"
        subtitle="Create a custom category to group your salon services"
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
              placeholder="e.g., Massage, Spa, Body Care"
              className="input-field"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              autoFocus
            />
          </div>
        </form>
      </Modal>

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
    </div>
  );
}
