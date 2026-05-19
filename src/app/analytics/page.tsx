"use client";

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const monthlyData = [
  { month: "Jan", revenue: 42000, expenses: 18000, profit: 24000, clients: 180 },
  { month: "Feb", revenue: 38500, expenses: 16500, profit: 22000, clients: 165 },
  { month: "Mar", revenue: 51000, expenses: 21000, profit: 30000, clients: 210 },
  { month: "Apr", revenue: 47800, expenses: 19500, profit: 28300, clients: 195 },
  { month: "May", revenue: 63200, expenses: 24000, profit: 39200, clients: 248 },
  { month: "Jun", revenue: 58900, expenses: 22500, profit: 36400, clients: 232 },
  { month: "Jul", revenue: 72400, expenses: 27000, profit: 45400, clients: 280 },
];

const serviceRevenue = [
  { name: "Hair Services", revenue: 128000, color: "#f43f5e", growth: 18.2 },
  { name: "Facial & Skin", revenue: 89400, color: "#a855f7", growth: 24.5 },
  { name: "Nail Care", revenue: 64800, color: "#fbbf24", growth: 12.1 },
  { name: "Body & Wax", revenue: 43200, color: "#06b6d4", growth: -3.2 },
  { name: "Packages", revenue: 38900, color: "#10b981", growth: 31.8 },
];

const staffPerformance = [
  { name: "Maria K.", bookings: 142, revenue: 186400, rating: 4.9, color: "#f43f5e" },
  { name: "Jana L.", bookings: 128, revenue: 142800, rating: 4.8, color: "#a855f7" },
  { name: "Priya S.", bookings: 116, revenue: 98600, rating: 4.9, color: "#fbbf24" },
  { name: "Rina D.", bookings: 94, revenue: 76200, rating: 4.7, color: "#06b6d4" },
];

const weeklyData = [
  { day: "Mon", bookings: 18, walkins: 5 },
  { day: "Tue", bookings: 22, walkins: 7 },
  { day: "Wed", bookings: 28, walkins: 9 },
  { day: "Thu", bookings: 24, walkins: 6 },
  { day: "Fri", bookings: 34, walkins: 12 },
  { day: "Sat", bookings: 42, walkins: 18 },
  { day: "Sun", bookings: 30, walkins: 10 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(21,10,14,0.95)", border: "1px solid rgba(244,63,94,0.2)", backdropFilter: "blur(12px)" }}>
        <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{typeof p.value === "number" && p.value > 1000 ? `₹${p.value.toLocaleString()}` : p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const kpis = [
    { label: "Total Revenue (YTD)", value: "₹3,74,800", change: "+22.4%", up: true },
    { label: "Net Profit Margin", value: "58.2%", change: "+4.1%", up: true },
    { label: "Customer Retention", value: "84%", change: "+2.8%", up: true },
    { label: "Avg. Ticket Size", value: "₹2,140", change: "-1.2%", up: false },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-rose-400" />
            Analytics
          </h1>
          <p className="section-subtitle">Insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {["7D", "1M", "3M", "6M", "1Y"].map((p, i) => (
              <button key={p} className="px-3 py-2.5 text-xs font-medium transition-all"
                style={{ background: i === 2 ? "rgba(244,63,94,0.2)" : "transparent", color: i === 2 ? "#fb7185" : "var(--text-muted)" }}>
                {p}
              </button>
            ))}
          </div>
          <button className="btn-secondary">
            <Calendar className="w-4 h-4" />
            Custom Range
          </button>
          <button className="btn-primary">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
            <p className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold ${kpi.up ? "text-emerald-400" : "text-rose-400"}`}>
              {kpi.up ? <ArrowUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {kpi.change} vs last period
            </div>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Revenue vs Expenses vs Profit</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Monthly breakdown</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {[{ color: "#f43f5e", label: "Revenue" }, { color: "#a855f7", label: "Expenses" }, { color: "#10b981", label: "Profit" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span style={{ color: "var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData}>
            <defs>
              {[["revGrad", "#f43f5e"], ["expGrad", "#a855f7"], ["profGrad", "#10b981"]].map(([id, color]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f43f5e" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} fill="url(#expGrad)" dot={false} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#profGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Bookings */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>Weekly Bookings</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Appointments vs walk-ins</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" name="Bookings" fill="#f43f5e" radius={[4, 4, 0, 0]} fillOpacity={0.9} />
              <Bar dataKey="walkins" name="Walk-ins" fill="#a855f7" radius={[4, 4, 0, 0]} fillOpacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Revenue Breakdown */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Revenue by Service</h2>
          <div className="space-y-4">
            {serviceRevenue.map((service, i) => {
              const maxRev = Math.max(...serviceRevenue.map(s => s.revenue));
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{service.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${service.growth > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {service.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(service.growth)}%
                      </span>
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>₹{(service.revenue / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(service.revenue / maxRev) * 100}%`, background: `linear-gradient(90deg, ${service.color}, ${service.color}80)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Staff Performance</h2>
          <div className="space-y-4">
            {staffPerformance.map((staff, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${staff.color}20`, color: staff.color }}>
                  {staff.name[0]}{staff.name.split(" ")[1][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{staff.name}</span>
                    <span className="text-xs font-bold" style={{ color: staff.color }}>₹{(staff.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1" style={{ height: "6px" }}>
                      <div className="progress-fill" style={{ width: `${(staff.bookings / 142) * 100}%`, background: `linear-gradient(90deg, ${staff.color}, ${staff.color}70)`, height: "6px" }} />
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{staff.bookings} appts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
