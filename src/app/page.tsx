"use client";

import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  CalendarCheck, Plus, ArrowRight, Clock,
  Scissors, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
  revenue:      { thisMonth: number; lastMonth: number; changePercent: number };
  bookings:     { today: number; newToday: number };
  clients:      { total: number; newThisMonth: number };
  productsSold: { thisMonth: number; lastMonth: number; changePercent: number };
  alerts:       { lowStockCount: number };
  todayAppointments: any[];
}
interface AnalyticsData {
  monthlyRevenue:   { month: string; revenue: number }[];
  serviceBreakdown: { name: string; category: string; revenue: number }[];
}

const PERIOD_LABELS: Record<string, string> = {
  "1M": "1 Month", "3M": "3 Months", "6M": "6 Months", "1Y": "1 Year",
};
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PIE_COLORS = ["#f43f5e","#a855f7","#06b6d4","#f59e0b","#10b981","#6366f1"];

const statusColors: Record<string, string> = {
  CONFIRMED:   "#10b981",
  IN_PROGRESS: "#a855f7",
  PENDING:     "#f59e0b",
  COMPLETED:   "#06b6d4",
  CANCELLED:   "#6b7280",
};

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function StatCardSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
        <div className="w-16 h-5 rounded-full bg-white/[0.06]" />
      </div>
      <div className="w-24 h-7 rounded bg-white/[0.06] mb-2" />
      <div className="w-32 h-4 rounded bg-white/[0.04]" />
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("6M");

  const periodMonths = period === "1M" ? 1 : period === "3M" ? 3 : period === "1Y" ? 12 : 6;
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - periodMonths + 1);
  fromDate.setDate(1);

  const { data: stats, loading: statsLoading } = useApi<DashboardStats>("/api/dashboard/stats");
  const { data: analytics, loading: analyticsLoading } = useApi<AnalyticsData>(
    `/api/analytics?from=${fromDate.toISOString()}&to=${new Date().toISOString()}`
  );

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const chartData = (analytics?.monthlyRevenue ?? []).map(m => ({
    name: MONTH_ABBR[parseInt(m.month.split("-")[1]) - 1],
    revenue: Math.round(m.revenue),
  }));

  const pieData = (analytics?.serviceBreakdown ?? []).slice(0, 6).map(s => ({
    name: s.category,
    value: Math.round(s.revenue),
  }));

  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? fmt(stats.revenue.thisMonth) : "—",
      change: stats?.revenue.changePercent ?? 0,
      sub: "vs last month",
      icon: ShoppingBag,
      color: "#f43f5e",
    },
    {
      label: "Bookings Today",
      value: stats ? String(stats.bookings.today) : "—",
      change: stats?.bookings.newToday ?? 0,
      sub: `${stats?.bookings.newToday ?? 0} new today`,
      icon: CalendarCheck,
      color: "#a855f7",
      isCount: true,
    },
    {
      label: "Active Clients",
      value: stats ? stats.clients.total.toLocaleString() : "—",
      change: stats?.clients.newThisMonth ?? 0,
      sub: `+${stats?.clients.newThisMonth ?? 0} new this month`,
      icon: Users,
      color: "#f59e0b",
      isCount: true,
    },
    {
      label: "Products Sold",
      value: stats ? String(stats.productsSold.thisMonth) : "—",
      change: stats?.productsSold.changePercent ?? 0,
      sub: "vs last month",
      icon: ShoppingBag,
      color: "#06b6d4",
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">✨ {greeting}, Admin ✨</h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening at your salon today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary"><Clock className="w-4 h-4" /> Schedule</button>
          <button className="btn-primary"><Plus className="w-4 h-4" /> New Booking</button>
        </div>
      </div>

      {/* Low stock alert */}
      {stats && stats.alerts.lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {stats.alerts.lowStockCount} product{stats.alerts.lowStockCount > 1 ? "s" : ""} running low on stock.
          <a href="/products" className="ml-auto underline underline-offset-2 text-xs">View Products →</a>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statsLoading
          ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const isPositive = card.isCount ? (card.change as number) >= 0 : (card.change as number) >= 0;
              return (
                <div key={card.label} className="glass-card p-5 hover:scale-[1.01] transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${card.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    {!card.isCount && (
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(card.change as number)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{card.value}</p>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{card.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{card.sub}</p>
                </div>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="card-title">Revenue Overview</h2>
              <p className="card-subtitle">Monthly performance</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
              {Object.keys(PERIOD_LABELS).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`period-pill ${period === p ? "active" : ""}`}>{p}</button>
              ))}
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px" }}
                  labelStyle={{ color: "var(--text-primary)" }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: "#f43f5e", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Mix Pie */}
        <div className="glass-card p-5">
          <h2 className="card-title mb-1">Service Mix</h2>
          <p className="card-subtitle mb-4">By revenue share</p>
          {analyticsLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px" }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v: string) => <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-sm mt-16" style={{ color: "var(--text-muted)" }}>No data yet</p>
          )}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="card-title">Today&apos;s Schedule</h2>
            <p className="card-subtitle">
              {statsLoading ? "Loading..." : `${stats?.todayAppointments.length ?? 0} appointments`}
            </p>
          </div>
          <a href="/appointments" className="btn-ghost text-sm flex items-center gap-1.5">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {statsLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }}>
                <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 rounded bg-white/[0.06]" />
                  <div className="w-48 h-3 rounded bg-white/[0.04]" />
                </div>
                <div className="w-20 h-6 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : stats?.todayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--text-muted)" }}>
            <CalendarCheck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No appointments scheduled for today</p>
            <button className="btn-primary mt-4 text-xs px-4 py-2"><Plus className="w-3.5 h-3.5" /> Book Now</button>
          </div>
        ) : (
          <div className="space-y-2">
            {(stats?.todayAppointments ?? []).map((appt: any) => {
              const initials = appt.client?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) ?? "??";
              return (
                <div key={appt.id} className="flex items-center gap-4 p-3.5 rounded-xl cursor-pointer hover:bg-[var(--bg-card)] transition-all"
                  style={{ border: "1px solid var(--border-subtle)" }}>
                  <div className="avatar w-9 h-9 text-xs flex-shrink-0">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{appt.client?.name}</p>
                    <p className="text-xs truncate flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Scissors className="w-3 h-3 flex-shrink-0" />
                      {appt.service?.name} · {appt.staff?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>{appt.startTime}</span>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${statusColors[appt.status] ?? "#6b7280"}15`, color: statusColors[appt.status] ?? "#6b7280" }}>
                      {appt.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
