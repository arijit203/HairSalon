"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Scissors,
  Clock,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Tag,
} from "lucide-react";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: string | number;
  discountPrice: string | number | null;
  isPopular: boolean;
  imageUrl: string | null;
}

export default function PortalServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const CATEGORIES = useMemo(() => {
    const cats = services.map(s => (s.category || "").toUpperCase()).filter(Boolean);
    const unique = Array.from(new Set(cats));
    return ["ALL", ...unique];
  }, [services]);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        if (res.ok && data.success) {
          setServices(data.data);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const filteredServices = services.filter((service) => {
    const matchesCategory =
      activeCategory === "ALL" ||
      service.category.toUpperCase() === activeCategory.toUpperCase();
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description &&
        service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Loading our salon menu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair)" }}>
            Salon Menu & Services
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Explore our curated range of professional beauty and styling services
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search hair cutting, facial…"
            className="input-field pl-10 pr-4 py-2 text-sm w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? "bg-rose-500 border-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.25)]"
                : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 glass-card max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No services found</p>
          <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="glass-card hover-glow flex flex-col justify-between p-6 h-full relative group transition-all duration-300"
            >
              {/* Popular Tag */}
              {service.isPopular && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-3 h-3" /> POPULAR
                </span>
              )}

              <div className="space-y-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/10">
                  {service.category}
                </span>

                <h3 className="text-lg font-bold text-white leading-snug group-hover:text-rose-400 transition-colors">
                  {service.name}
                </h3>

                <p className="text-xs text-zinc-400 line-clamp-3 min-h-[48px]">
                  {service.description || "Indulge in a premium professional styling treatment customized for your hair and skin type."}
                </p>
              </div>

              {/* Action and Pricing */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">
                    ₹{Number(service.price).toLocaleString("en-IN")}
                  </span>
                  {service.discountPrice && (
                    <span className="text-xs text-zinc-500 line-through">
                      ₹{Number(service.discountPrice).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <Link
                  href={`/portal/bookings?serviceId=${service.id}`}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all duration-300 group/btn"
                >
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
