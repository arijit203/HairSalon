"use client";

import {
  Users,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Filter,
  Crown,
  Heart,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";
import { useState } from "react";

const clients = [
  {
    id: 1, name: "Sophia Chen", email: "sophia@email.com", phone: "+91 98765 43210",
    totalSpent: 48500, visits: 24, lastVisit: "May 15, 2026", nextAppt: "May 22, 2026",
    tier: "platinum", rating: 5.0, joinDate: "Jan 2024",
    avatar: "SC", color: "#f43f5e", services: ["Hair Coloring", "Facial", "Manicure"],
    loyaltyPoints: 4850,
  },
  {
    id: 2, name: "Isabella Rose", email: "isabella@email.com", phone: "+91 87654 32109",
    totalSpent: 32200, visits: 18, lastVisit: "May 17, 2026", nextAppt: "May 19, 2026",
    tier: "gold", rating: 4.9, joinDate: "Mar 2024",
    avatar: "IR", color: "#a855f7", services: ["Facial", "Waxing"],
    loyaltyPoints: 3220,
  },
  {
    id: 3, name: "Emma Davis", email: "emma@email.com", phone: "+91 76543 21098",
    totalSpent: 21800, visits: 14, lastVisit: "May 10, 2026", nextAppt: "May 19, 2026",
    tier: "silver", rating: 4.8, joinDate: "Jun 2024",
    avatar: "ED", color: "#06b6d4", services: ["Manicure", "Pedicure"],
    loyaltyPoints: 2180,
  },
  {
    id: 4, name: "Olivia Martin", email: "olivia@email.com", phone: "+91 65432 10987",
    totalSpent: 15400, visits: 9, lastVisit: "May 8, 2026", nextAppt: "May 19, 2026",
    tier: "silver", rating: 4.7, joinDate: "Sep 2024",
    avatar: "OM", color: "#fbbf24", services: ["Waxing", "Hair Cut"],
    loyaltyPoints: 1540,
  },
  {
    id: 5, name: "Zara Ahmed", email: "zara@email.com", phone: "+91 54321 09876",
    totalSpent: 8900, visits: 5, lastVisit: "May 6, 2026", nextAppt: "May 19, 2026",
    tier: "bronze", rating: 4.9, joinDate: "Jan 2025",
    avatar: "ZA", color: "#10b981", services: ["Hair Cut", "Blowout"],
    loyaltyPoints: 890,
  },
  {
    id: 6, name: "Priya Patel", email: "priya@email.com", phone: "+91 43210 98765",
    totalSpent: 62400, visits: 31, lastVisit: "May 18, 2026", nextAppt: "May 20, 2026",
    tier: "platinum", rating: 5.0, joinDate: "Nov 2023",
    avatar: "PP", color: "#f97316", services: ["Anti-Aging Facial", "Hair Spa", "Bridal"],
    loyaltyPoints: 6240,
  },
  {
    id: 7, name: "Nadia Kim", email: "nadia@email.com", phone: "+91 32109 87654",
    totalSpent: 28600, visits: 16, lastVisit: "May 14, 2026", nextAppt: "May 20, 2026",
    tier: "gold", rating: 4.8, joinDate: "Apr 2024",
    avatar: "NK", color: "#ec4899", services: ["Bridal Package", "Facial"],
    loyaltyPoints: 2860,
  },
  {
    id: 8, name: "Sofia Lopez", email: "sofia@email.com", phone: "+91 21098 76543",
    totalSpent: 4200, visits: 3, lastVisit: "May 2, 2026", nextAppt: "May 20, 2026",
    tier: "bronze", rating: 4.6, joinDate: "Mar 2025",
    avatar: "SL", color: "#8b5cf6", services: ["Gel Manicure"],
    loyaltyPoints: 420,
  },
];

const tierConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  platinum: { label: "Platinum", color: "#e2e8f0", bg: "rgba(226,232,240,0.15)", icon: "💎" },
  gold: { label: "Gold", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", icon: "👑" },
  silver: { label: "Silver", color: "#94a3b8", bg: "rgba(148,163,184,0.15)", icon: "🥈" },
  bronze: { label: "Bronze", color: "#d97706", bg: "rgba(217,119,6,0.15)", icon: "🥉" },
};

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("All");
  const [selectedClient, setSelectedClient] = useState<typeof clients[0] | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTier = selectedTier === "All" || c.tier === selectedTier.toLowerCase();
    return matchSearch && matchTier;
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-400" />
            Clients
          </h1>
          <p className="page-subtitle">{clients.length} total clients · {clients.filter(c => c.tier === "platinum").length} platinum members</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length, color: "#f43f5e" },
          { label: "Total Revenue", value: `₹${(clients.reduce((a, c) => a + c.totalSpent, 0) / 1000).toFixed(0)}K`, color: "#10b981" },
          { label: "Avg. Visits", value: (clients.reduce((a, c) => a + c.visits, 0) / clients.length).toFixed(1), color: "#a855f7" },
          { label: "Avg. Spend", value: `₹${(clients.reduce((a, c) => a + c.totalSpent, 0) / clients.length / 1000).toFixed(1)}K`, color: "#fbbf24" },
        ].map((s, i) => (
          <div key={i} className="glass-card p-4">
            <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search clients..." className="input-field pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          {"All Platinum Gold Silver Bronze".split(" ").map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`filter-pill ${selectedTier === tier ? "active" : ""}`}
            >
              {tier !== "All" && tierConfig[tier.toLowerCase()]?.icon} {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Client Table */}
        <div className="xl:col-span-2 glass-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Tier</th>
                <th>Total Spent</th>
                <th>Visits</th>
                <th>Last Visit</th>
                <th>Points</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const tier = tierConfig[client.tier];
                return (
                  <tr
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="avatar text-sm"
                          style={{ background: `${client.color}20`, color: client.color, border: `1px solid ${client.color}30` }}
                        >
                          {client.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tier.bg, color: tier.color }}>
                        {tier.icon} {tier.label}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>₹{client.totalSpent.toLocaleString()}</span>
                    </td>
                    <td>{client.visits}</td>
                    <td>{client.lastVisit}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span className="font-medium text-rose-400">{client.loyaltyPoints}</span>
                      </div>
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          className="btn-icon w-8 h-8"
                          onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === client.id ? null : client.id); }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === client.id && (
                          <div className="dropdown-menu absolute right-0 z-20" style={{ top: "100%" }}>
                            {[{ label: "View", icon: Eye }, { label: "Edit", icon: Edit2 }, { label: "Delete", icon: Trash2, danger: true }].map(a => {
                              const Icon = a.icon;
                              return (
                                <button key={a.label} onClick={() => setOpenMenu(null)} className={`dropdown-item ${(a as any).danger ? "danger" : ""}`}>
                                  <Icon className="w-3.5 h-3.5" />{a.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Client Detail Card */}
        {selectedClient ? (
          <div className="glass-card p-6 space-y-5">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-3"
                style={{ background: `${selectedClient.color}20`, color: selectedClient.color, border: `1px solid ${selectedClient.color}30` }}
              >
                {selectedClient.avatar}
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{selectedClient.name}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full mt-2"
                style={{ background: tierConfig[selectedClient.tier].bg, color: tierConfig[selectedClient.tier].color }}>
                {tierConfig[selectedClient.tier].icon} {tierConfig[selectedClient.tier].label} Member
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { icon: Mail, label: selectedClient.email },
                { icon: Phone, label: selectedClient.phone },
                { icon: Calendar, label: `Member since ${selectedClient.joinDate}` },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    {item.label}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 border-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {[
                { label: "Total Spent", value: `₹${selectedClient.totalSpent.toLocaleString()}` },
                { label: "Total Visits", value: selectedClient.visits },
                { label: "Loyalty Points", value: selectedClient.loyaltyPoints },
                { label: "Avg. Rating Given", value: selectedClient.rating },
              ].map((s, i) => (
                <div key={i} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Favorite Services</p>
              <div className="flex flex-wrap gap-2">
                {selectedClient.services.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185" }}>{s}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-primary flex-1 justify-center">Book Appointment</button>
              <button className="btn-secondary px-3 py-2.5">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: "300px" }}>
            <Users className="w-12 h-12 mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Select a client</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Click on any client to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
