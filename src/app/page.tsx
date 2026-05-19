"use client";

import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  CalendarCheck, DollarSign, Star, ArrowRight,
  Clock, Scissors, Package, ChevronRight, Sparkles, Plus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 38500 },
  { month: "Mar", revenue: 51000 },
  { month: "Apr", revenue: 47800 },
  { month: "May", revenue: 63200 },
  { month: "Jun", revenue: 58900 },
  { month: "Jul", revenue: 72400 },
];

const serviceBreakdown = [
  { name: "Hair Services",  value: 38, color: "#f43f5e" },
  { name: "Facial & Skin",  value: 24, color: "#a855f7" },
  { name: "Nail Care",      value: 18, color: "#fbbf24" },
  { name: "Waxing",         value: 12, color: "#06b6d4" },
  { name: "Others",         value: 8,  color: "#6b7280" },
];

const todayAppointments = [
  { id: 1, client: "Sophia Chen",    service: "Hair Coloring",      time: "9:00 AM",  duration: "90 min", status: "confirmed",   avatar: "SC", color: "#f43f5e", staff: "Maria K." },
  { id: 2, client: "Isabella Rose",  service: "Deep Facial",        time: "10:30 AM", duration: "60 min", status: "in-progress", avatar: "IR", color: "#a855f7", staff: "Jana L."  },
  { id: 3, client: "Emma Davis",     service: "Gel Mani + Pedi",    time: "12:00 PM", duration: "75 min", status: "confirmed",   avatar: "ED", color: "#06b6d4", staff: "Priya S." },
  { id: 4, client: "Olivia Martin",  service: "Brazilian Wax",      time: "1:30 PM",  duration: "45 min", status: "pending",     avatar: "OM", color: "#fbbf24", staff: "Maria K." },
  { id: 5, client: "Zara Ahmed",     service: "Hair Cut & Blowout", time: "3:00 PM",  duration: "50 min", status: "confirmed",   avatar: "ZA", color: "#10b981", staff: "Jana L."  },
];

const topProducts = [
  { name: "Kérastase Serum",     sold: 42, revenue: 2940, trend: "up"   },
  { name: "L'Oreal Masque",      sold: 38, revenue: 1900, trend: "up"   },
  { name: "OPI Nail Polish Set", sold: 34, revenue: 1360, trend: "down" },
  { name: "Moroccanoil Shampoo", sold: 29, revenue: 1740, trend: "up"   },
];

const statCards = [
  { label: "Total Revenue",    value: "₹3,72,400", change: "+18.2%", up: true,  icon: DollarSign,    accent: "#f43f5e", sub: "vs last month"    },
  { label: "Bookings Today",   value: "24",         change: "+3 new", up: true,  icon: CalendarCheck, accent: "#a855f7", sub: "6 remaining today" },
  { label: "Active Clients",   value: "1,284",      change: "+42",    up: true,  icon: Users,         accent: "#fbbf24", sub: "new this month"    },
  { label: "Products Sold",    value: "348",         change: "-4.1%",  up: false, icon: ShoppingBag,   accent: "#06b6d4", sub: "vs last month"    },
];

const statusBadge: Record<string, string> = {
  "confirmed":   "badge-success",
  "in-progress": "badge-purple",
  "pending":     "badge-warning",
};
const statusLabel: Record<string, string> = {
  "confirmed":   "Confirmed",
  "in-progress": "In Progress",
  "pending":     "Pending",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl text-sm" style={{
      background: "var(--bg-tooltip)", border: "1px solid rgba(244,63,94,0.2)",
      backdropFilter: "blur(12px)", boxShadow: "var(--shadow-dropdown)",
    }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          Revenue: <span className="font-semibold">₹{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">

      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-400" />
            Good morning, Admin ✨
          </h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening at your salon today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Clock className="w-4 h-4" />
            Schedule
          </button>
          <button className="btn-primary">
            <CalendarCheck className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.accent}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.accent }} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold ${card.up ? "text-emerald-500" : "text-rose-400"}`}>
                  {card.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold leading-none mb-1" style={{ color: "var(--text-primary)" }}>
                {card.value}
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{card.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue Chart */}
        <div className="glass-card p-6 xl:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="card-title">Revenue Overview</h2>
              <p className="card-subtitle">Monthly performance</p>
            </div>
            <div className="flex items-center gap-1.5">
              {["1M","3M","6M","1Y"].map((p, i) => (
                <button key={p} className={`period-pill ${i === 2 ? "active" : ""}`}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2.5}
                fill="url(#revG)"
                dot={{ fill: "#f43f5e", strokeWidth: 0, r: 3.5 }}
                activeDot={{ r: 5.5, fill: "#fb7185", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Service Pie */}
        <div className="glass-card p-6">
          <h2 className="card-title mb-0.5">Service Mix</h2>
          <p className="card-subtitle mb-3">By revenue share</p>
          <div className="flex justify-center">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={3} dataKey="value">
                  {serviceBreakdown.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-3">
            {serviceBreakdown.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Today's Appointments */}
        <div className="glass-card xl:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <h2 className="card-title">Today&apos;s Appointments</h2>
              <p className="card-subtitle">{todayAppointments.length} scheduled</p>
            </div>
            <button className="btn-ghost text-xs">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--bg-card)] transition-colors cursor-pointer group">
                <div
                  className="avatar text-xs"
                  style={{ background: `${appt.color}20`, color: appt.color, border: `1px solid ${appt.color}35`, width:"36px", height:"36px" }}
                >
                  {appt.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{appt.client}</span>
                    <span className={statusBadge[appt.status]}>{statusLabel[appt.status]}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    <Scissors className="w-3 h-3 inline mr-1" />{appt.service} · {appt.staff}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{appt.time}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{appt.duration}</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "var(--text-muted)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Top Products */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Top Products</h2>
              <button className="btn-ghost text-xs px-2 py-1">
                All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3.5">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}
                  >
                    #{i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.sold} sold · ₹{p.revenue.toLocaleString()}</p>
                  </div>
                  {p.trend === "up"
                    ? <TrendingUp  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card p-5 flex-1">
            <h2 className="card-title mb-4">Quick Stats</h2>
            <div className="space-y-4">
              {[
                { label: "Avg. Rating",    value: "4.9 ⭐", pct: 92, color: "#fbbf24" },
                { label: "Low Stock Items",value: "8",      pct: 25, color: "#f43f5e" },
                { label: "Staff On-duty",  value: "6 / 8", pct: 75, color: "#a855f7" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${s.pct}%`, background:`linear-gradient(90deg,${s.color},${s.color}70)` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
