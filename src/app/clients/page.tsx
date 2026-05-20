"use client";

import { Users, Plus, Search, ChevronLeft, ChevronRight, Star, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { usePaginatedApi } from "@/hooks/useApi";

interface Client {
  id: string; name: string; email: string; phone?: string;
  tier: string; loyaltyPoints: number; totalSpent: string;
  totalVisits: number; createdAt: string;
  _count?: { appointments: number; transactions: number };
}

const TIER_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  PLATINUM: { color: "#e2e8f0", bg: "rgba(226,232,240,0.15)", icon: "💎" },
  GOLD:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "🥇" },
  SILVER:   { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "🥈" },
  BRONZE:   { color: "#b45309", bg: "rgba(180,83,9,0.12)",    icon: "🥉" },
};

const TIERS = ["All", "PLATINUM", "GOLD", "SILVER", "BRONZE"];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [tier,   setTier]   = useState("All");
  const [page,   setPage]   = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "12" });
  if (tier !== "All") params.set("tier", tier);
  if (search)         params.set("search", search);

  const { data: clients, pagination, loading } = usePaginatedApi<Client>(`/api/clients?${params}`);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="w-5 h-5 text-rose-400" /> Clients</h1>
          <p className="page-subtitle">{pagination.total} total clients</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search by name, email, phone..." className="input-field pl-10 w-full"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIERS.map(t => {
            const ts = TIER_STYLES[t];
            return (
              <button key={t} onClick={() => { setTier(t); setPage(1); }}
                className={`filter-pill text-xs ${tier === t ? "active" : ""}`}
                style={tier === t && ts ? { background: ts.bg, color: ts.color, borderColor: ts.color + "40" } : {}}>
                {ts?.icon ?? ""} {t === "All" ? "All Tiers" : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded bg-white/[0.06]" />
                    <div className="h-3 w-24 rounded bg-white/[0.04]" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array(3).fill(0).map((_, j) => <div key={j} className="h-12 rounded-lg bg-white/[0.04]" />)}
                </div>
              </div>
            ))
          : clients.map(client => {
              const ts = TIER_STYLES[client.tier] ?? TIER_STYLES.BRONZE;
              const initials = client.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={client.id} className="glass-card p-5 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                  {/* Avatar + tier */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: "linear-gradient(135deg, #f43f5e22, #a855f722)", color: "#fb7185", border: "2px solid #f43f5e30" }}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                        <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <Mail className="w-3 h-3" />{client.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background: ts.bg, color: ts.color }}>
                      {ts.icon} {client.tier.charAt(0) + client.tier.slice(1).toLowerCase()}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "Spent", value: `₹${(Number(client.totalSpent)/1000).toFixed(1)}k` },
                      { label: "Visits", value: client.totalVisits },
                      { label: "Points", value: client.loyaltyPoints },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contact */}
                  {client.phone && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Phone className="w-3 h-3" />{client.phone}
                    </p>
                  )}

                  {/* Loyalty bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                      <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5" /> {client.loyaltyPoints} pts</span>
                      <span>Next tier</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (client.loyaltyPoints % 1000) / 10)}%`, background: ts.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between glass-card px-5 py-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Page {page} of {pagination.totalPages} · {pagination.total} clients
          </p>
          <div className="flex items-center gap-2">
            <button className="btn-icon w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="btn-icon w-8 h-8" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
