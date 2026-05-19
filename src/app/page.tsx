"use client";

import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  CalendarCheck,
  DollarSign,
  Star,
  ArrowRight,
  Clock,
  Scissors,
  Package,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data
const revenueData = [
  { month: "Jan", revenue: 42000, bookings: 180 },
  { month: "Feb", revenue: 38500, bookings: 165 },
  { month: "Mar", revenue: 51000, bookings: 210 },
  { month: "Apr", revenue: 47800, bookings: 195 },
  { month: "May", revenue: 63200, bookings: 248 },
  { month: "Jun", revenue: 58900, bookings: 232 },
  { month: "Jul", revenue: 72400, bookings: 280 },
];

const serviceBreakdown = [
  { name: "Hair Services", value: 38, color: "#f43f5e" },
  { name: "Facial & Skin", value: 24, color: "#a855f7" },
  { name: "Nail Care", value: 18, color: "#fbbf24" },
  { name: "Waxing", value: 12, color: "#06b6d4" },
  { name: "Others", value: 8, color: "#6b7280" },
];

const todayAppointments = [
  {
    id: 1,
    client: "Sophia Chen",
    service: "Hair Coloring",
    time: "9:00 AM",
    duration: "90 min",
    status: "confirmed",
    avatar: "SC",
    color: "#f43f5e",
    staff: "Maria K.",
  },
  {
    id: 2,
    client: "Isabella Rose",
    service: "Deep Facial Treatment",
    time: "10:30 AM",
    duration: "60 min",
    status: "in-progress",
    avatar: "IR",
    color: "#a855f7",
    staff: "Jana L.",
  },
  {
    id: 3,
    client: "Emma Davis",
    service: "Gel Manicure + Pedicure",
    time: "12:00 PM",
    duration: "75 min",
    status: "confirmed",
    avatar: "ED",
    color: "#06b6d4",
    staff: "Priya S.",
  },
  {
    id: 4,
    client: "Olivia Martin",
    service: "Brazilian Wax",
    time: "1:30 PM",
    duration: "45 min",
    status: "pending",
    avatar: "OM",
    color: "#fbbf24",
    staff: "Maria K.",
  },
  {
    id: 5,
    client: "Zara Ahmed",
    service: "Hair Cut & Blowout",
    time: "3:00 PM",
    duration: "50 min",
    status: "confirmed",
    avatar: "ZA",
    color: "#10b981",
    staff: "Jana L.",
  },
];

const topProducts = [
  { name: "Kerastase Serum", sold: 42, revenue: 2940, trend: "up", stock: 18 },
  { name: "L'Oreal Masque", sold: 38, revenue: 1900, trend: "up", stock: 25 },
  { name: "OPI Nail Polish Set", sold: 34, revenue: 1360, trend: "down", stock: 8 },
  { name: "Moroccanoil Shampoo", sold: 29, revenue: 1740, trend: "up", stock: 32 },
];

const statCards = [
  {
    label: "Total Revenue",
    value: "₹3,72,400",
    change: "+18.2%",
    changeType: "up",
    icon: DollarSign,
    gradient: "linear-gradient(135deg, rgba(244,63,94,0.15) 0%, rgba(244,63,94,0.05) 100%)",
    iconBg: "rgba(244,63,94,0.2)",
    iconColor: "#f43f5e",
    subtext: "vs last month",
  },
  {
    label: "Bookings Today",
    value: "24",
    change: "+3 new",
    changeType: "up",
    icon: CalendarCheck,
    gradient: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)",
    iconBg: "rgba(168,85,247,0.2)",
    iconColor: "#a855f7",
    subtext: "6 remaining today",
  },
  {
    label: "Active Clients",
    value: "1,284",
    change: "+42",
    changeType: "up",
    icon: Users,
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
    iconBg: "rgba(251,191,36,0.2)",
    iconColor: "#fbbf24",
    subtext: "new this month",
  },
  {
    label: "Products Sold",
    value: "348",
    change: "-4.1%",
    changeType: "down",
    icon: ShoppingBag,
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)",
    iconBg: "rgba(6,182,212,0.2)",
    iconColor: "#06b6d4",
    subtext: "vs last month",
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-4 py-3 rounded-xl text-sm"
        style={{
          background: "rgba(21,10,14,0.95)",
          border: "1px solid rgba(244,63,94,0.2)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">₹{p.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const statusStyles: Record<string, string> = {
    confirmed: "badge-success",
    "in-progress": "badge-purple",
    pending: "badge-warning",
    cancelled: "badge-danger",
  };
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed",
    "in-progress": "In Progress",
    pending: "Pending",
    cancelled: "Cancelled",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-rose-400" />
            Good morning, Admin ✨
          </h1>
          <p className="section-subtitle mt-1">
            Here&apos;s what&apos;s happening at your salon today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            <Clock className="w-4 h-4" />
            View Schedule
          </button>
          <button className="btn-primary">
            <CalendarCheck className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s`, background: card.gradient, border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: card.iconBg }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${card.changeType === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                  {card.changeType === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {card.change}
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {card.value}
              </p>
              <p className="text-sm font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>
                {card.label}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {card.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="glass-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                Revenue Overview
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Monthly revenue trend
              </p>
            </div>
            <div className="flex items-center gap-2">
              {["1M", "3M", "6M", "1Y"].map((period, i) => (
                <button
                  key={period}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: i === 2 ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)",
                    color: i === 2 ? "#fb7185" : "var(--text-muted)",
                    border: i === 2 ? "1px solid rgba(244,63,94,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fill="url(#revGradient)"
                dot={{ fill: "#f43f5e", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#fb7185", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Service Breakdown Pie */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              Service Breakdown
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              By revenue share
            </p>
          </div>
          <div className="flex justify-center mb-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={serviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {serviceBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {serviceBreakdown.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Today's Appointments */}
        <div className="glass-card p-6 xl:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                Today&apos;s Appointments
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {todayAppointments.length} scheduled for today
              </p>
            </div>
            <button className="btn-secondary text-xs px-3 py-2">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {todayAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/[0.04] cursor-pointer group"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div
                  className="avatar text-sm"
                  style={{ background: `${appt.color}25`, color: appt.color, border: `1px solid ${appt.color}40` }}
                >
                  {appt.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {appt.client}
                    </p>
                    <span className={statusStyles[appt.status]}>{statusLabels[appt.status]}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      <Scissors className="w-3 h-3 inline mr-1" />{appt.service}
                    </p>
                    <p className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      by {appt.staff}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{appt.time}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{appt.duration}</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Top Products & Quick Stats */}
        <div className="xl:col-span-2 space-y-4">
          {/* Top Products */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Top Products
              </h2>
              <button className="text-xs font-medium flex items-center gap-1" style={{ color: "#fb7185" }}>
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185" }}
                  >
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {product.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {product.sold} sold · ₹{product.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${product.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                    {product.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
              Quick Stats
            </h2>
            <div className="space-y-4">
              {[
                { label: "Avg. Rating", value: "4.9", icon: Star, color: "#fbbf24", fill: "92%" },
                { label: "Low Stock Items", value: "8", icon: Package, color: "#f43f5e", fill: "25%" },
                { label: "Staff On-duty", value: "6/8", icon: Users, color: "#a855f7", fill: "75%" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: stat.fill, background: `linear-gradient(90deg, ${stat.color}, ${stat.color}80)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
