"use client";

import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  CalendarCheck, Plus, ArrowRight, Clock,
  Scissors, AlertTriangle, Printer,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useBooking } from "@/context/BookingContext";
import { useToast } from "@/context/ToastContext";

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
  const { openBooking } = useBooking();
  const { error } = useToast();
  const [period, setPeriod] = useState("6M");

  const periodMonths = period === "1M" ? 1 : period === "3M" ? 3 : period === "1Y" ? 12 : 6;
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - periodMonths + 1);
  fromDate.setDate(1);

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = new Date().toISOString().split("T")[0];

  const { data: stats, loading: statsLoading } = useApi<DashboardStats>("/api/dashboard/stats");
  const { data: analytics, loading: analyticsLoading } = useApi<AnalyticsData>(
    `/api/analytics?from=${fromStr}&to=${toStr}`
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

  // Helper to group appointments by client, date, startTime, and endTime
  const groupAppointments = (appts: any[]) => {
    const groups: Record<string, any> = {};
    appts.forEach((appt) => {
      const datePart = typeof appt.date === "string" ? appt.date.split("T")[0] : new Date(appt.date).toISOString().split("T")[0];
      const key = `${appt.clientId}_${datePart}_${appt.startTime}_${appt.endTime}`;
      if (!groups[key]) {
        groups[key] = {
          id: appt.id,
          clientId: appt.clientId,
          client: appt.client,
          staff: appt.staff,
          date: datePart,
          startTime: appt.startTime,
          endTime: appt.endTime,
          status: appt.status,
          notes: appt.notes,
          appointments: [],
        };
      }
      groups[key].appointments.push(appt);
    });
    return Object.values(groups);
  };

  const handlePrintReceipt = (group: any) => {
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const servicesHtml = group.appointments.map((a: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>${a.service?.name ?? "Service"}</span>
        <span>₹${Number(a.price).toFixed(2)}</span>
      </div>
    `).join("");

    const totalPrice = group.appointments.reduce((sum: number, a: any) => sum + Number(a.price), 0);

    const timeStr = group.startTime 
      ? `${group.startTime} - ${group.endTime}`
      : `Ends at ${group.endTime}`;

    const staffNames = Array.from(new Set(group.appointments.map((a: any) => a.staff?.name).filter(Boolean))).join(", ");

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              width: 48mm;
              margin: 0 auto;
              padding: 10px 5px;
              color: #000;
              background: #fff;
              line-height: 1.2;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: bold;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .totals {
              font-size: 12px;
              margin-top: 5px;
            }
            .footer {
              margin-top: 15px;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px; margin-bottom: 2px;">MADOE SALON</div>
          <div class="center" style="font-size: 9px; margin-bottom: 5px;">Wyapar Salon Management</div>
          <div class="divider"></div>
          
          <div><strong>Date:</strong> ${group.date}</div>
          <div><strong>Time:</strong> ${timeStr}</div>
          <div><strong>Passenger:</strong> ${group.client?.name ?? "Walk-in"}</div>
          ${group.client?.phone ? `<div><strong>Phone:</strong> ${group.client.phone}</div>` : ""}
          <div><strong>Staff:</strong> ${staffNames}</div>
          
          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 5px;">SERVICES</div>
          ${servicesHtml}
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>Subtotal</span>
            <span>₹${totalPrice.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 3px;">
            <span>TOTAL</span>
            <span>₹${totalPrice.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="center footer">
            Thank you for visiting!<br>
            Powered by Wyapar
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Partition today's appointments:
  // 1. Scheduled / Pending: future slots or pending status
  // 2. Ongoing & Past schedule
  const getLocalDateStr = () => {
    const local = new Date();
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, "0");
    const d = String(local.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const getLocalTimeStr = () => {
    const local = new Date();
    const hrs = String(local.getHours()).padStart(2, "0");
    const mins = String(local.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  const todayDateStr = getLocalDateStr();
  const nowTime = getLocalTimeStr();
  const todayAppts = stats?.todayAppointments ?? [];
  const groupedAppts = groupAppointments(todayAppts);

  const scheduledPending = groupedAppts.filter((group: any) => {
    const isFutureDate = group.date > todayDateStr;
    const isTodayFutureTime = group.date === todayDateStr && group.startTime > nowTime;
    const isFuture = isFutureDate || isTodayFutureTime;
    const isActiveOrPending = ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(group.status);
    return isFuture && isActiveOrPending;
  });

  const otherAppointments = groupedAppts.filter((group: any) => {
    return !scheduledPending.some((s: any) => s.id === group.id);
  });

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
          <button className="btn-primary" onClick={() => openBooking()}><Plus className="w-4 h-4" /> New Booking</button>
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
          <div className="space-y-6">
            {/* Scheduled / Pending Section */}
            {scheduledPending.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    Scheduled / Pending ({scheduledPending.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {scheduledPending.map((group: any) => {
                    const initials = group.client?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) ?? "??";
                    const servicesStr = group.appointments.map((a: any) => a.service?.name).join(", ");
                    const staffNames = Array.from(new Set(group.appointments.map((a: any) => a.staff?.name).filter(Boolean))).join(", ");
                    return (
                      <div key={group.id} className="flex items-center justify-between gap-4 p-3.5 rounded-xl hover:bg-[var(--bg-card)] transition-all bg-amber-500/[0.01]"
                        style={{ border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="avatar w-9 h-9 text-xs flex-shrink-0">{initials}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{group.client?.name}</p>
                            <p className="text-xs truncate flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                              <Scissors className="w-3 h-3 flex-shrink-0" />
                              {servicesStr} · {staffNames}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-bold tabular-nums block" style={{ color: "var(--text-secondary)" }}>
                              {group.date !== todayDateStr ? `${new Date(group.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ` : ''}{group.startTime} - {group.endTime}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                            style={{ background: `${statusColors[group.status] ?? "#6b7280"}15`, color: statusColors[group.status] ?? "#6b7280" }}>
                            {group.status.replace("_", " ")}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(group);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors flex items-center justify-center"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other / Past / Completed Section */}
            {otherAppointments.length > 0 && (
              <div className="space-y-2.5">
                {scheduledPending.length > 0 && <div className="border-t border-[var(--border-subtle)] my-4" />}
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                    Ongoing & Past Schedule ({otherAppointments.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {otherAppointments.map((group: any) => {
                    const initials = group.client?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) ?? "??";
                    const servicesStr = group.appointments.map((a: any) => a.service?.name).join(", ");
                    const staffNames = Array.from(new Set(group.appointments.map((a: any) => a.staff?.name).filter(Boolean))).join(", ");
                    return (
                      <div key={group.id} className="flex items-center justify-between gap-4 p-3.5 rounded-xl hover:bg-[var(--bg-card)] transition-all"
                        style={{ border: "1px solid var(--border-subtle)" }}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="avatar w-9 h-9 text-xs flex-shrink-0">{initials}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{group.client?.name}</p>
                            <p className="text-xs truncate flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                              <Scissors className="w-3 h-3 flex-shrink-0" />
                              {servicesStr} · {staffNames}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-semibold tabular-nums block" style={{ color: "var(--text-secondary)" }}>
                              {group.date !== todayDateStr ? `${new Date(group.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ` : ''}{group.startTime} - {group.endTime}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                            style={{ background: `${statusColors[group.status] ?? "#6b7280"}15`, color: statusColors[group.status] ?? "#6b7280" }}>
                            {group.status.replace("_", " ")}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(group);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors flex items-center justify-center"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
