"use client";

import {
  BarChart3, TrendingUp, TrendingDown, Calendar,
  Download, ArrowUp, ArrowDown, Loader2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";

const SERVICE_COLORS: Record<string, string> = {
  "Hair Care": "#f43f5e",
  "Facial & Skin": "#a855f7",
  "Skin Care": "#a855f7",
  "Nail Care": "#fbbf24",
  "Body & Wax": "#06b6d4",
  "Packages": "#10b981",
  "Retail": "#10b981",
};

const STAFF_COLORS = ["#f43f5e", "#a855f7", "#fbbf24", "#06b6d4", "#10b981"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl text-sm" style={{
      background: "var(--bg-tooltip)", border: "1px solid rgba(244,63,94,0.2)",
      backdropFilter:"blur(12px)", boxShadow:"var(--shadow-dropdown)",
    }}>
      <p className="font-semibold mb-1" style={{ color:"var(--text-primary)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">
            {typeof p.value === "number" && p.value > 999 ? `₹${p.value.toLocaleString("en-IN")}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("3M");

  const getPeriodDates = (p: string) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    const from = new Date();
    if (p === "7D") {
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
    } else if (p === "1M") {
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    } else if (p === "3M") {
      from.setMonth(from.getMonth() - 2);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (p === "6M") {
      from.setMonth(from.getMonth() - 5);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else {
      // 1Y
      from.setMonth(from.getMonth() - 11);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    }
    return { from, to };
  };

  const { from, to } = getPeriodDates(period);
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  const { data, loading } = useApi<any>(
    `/api/analytics?from=${fromStr}&to=${toStr}&period=${period}`
  );

  const kpis = data?.kpis ?? [
    { label: "Total Revenue (Period)", value: "₹0", change: "0.0%", up: true },
    { label: "Net Profit Margin", value: "0.0%", change: "0.0%", up: true },
    { label: "Customer Retention", value: "0%", change: "0.0%", up: true },
    { label: "Avg. Ticket Size", value: "₹0", change: "0.0%", up: true },
  ];

  const monthlyData = data?.revenueData ?? [];
  const weeklyData = data?.weeklyData ?? [];
  const serviceRevenue = data?.serviceRevenue ?? [];
  const staffPerformance = data?.staffStats ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-400" /> Analytics
          </h1>
          <p className="page-subtitle">Performance insights and business metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
            {["7D","1M","3M","6M","1Y"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`period-pill rounded-none border-none ${period === p ? "active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn-secondary"><Calendar className="w-4 h-4" />Custom</button>
          <button className="btn-primary" onClick={() => window.print()}><Download className="w-4 h-4" />Print</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k: any, i: number) => (
          <div key={i} className="glass-card p-5 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-black/5 animate-pulse" />
            )}
            <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>{k.label}</p>
            <p className="text-2xl font-bold mb-2" style={{ color:"var(--text-primary)" }}>{k.value}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold ${k.change.startsWith("-") || !k.up ? "text-rose-400" : "text-emerald-500"}`}>
              {k.change.startsWith("-") || !k.up ? <TrendingDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
              {k.change.replace(/[+-]/g, "")} vs last period
            </div>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses */}
      <div className="glass-card p-6 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
          </div>
        )}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="card-title">Revenue vs Expenses vs Profit</h2>
            <p className="card-subtitle">Period breakdown</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {[{ color:"#f43f5e",label:"Revenue"},{ color:"#a855f7",label:"Expenses"},{ color:"#10b981",label:"Profit"}].map(l=>(
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background:l.color }} />
                <span style={{ color:"var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        {monthlyData.length === 0 ? (
          <div className="h-[270px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
            No transaction history for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={monthlyData}>
              <defs>
                {[["rG","#f43f5e"],["eG","#a855f7"],["pG","#10b981"]].map(([id,color])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill:"var(--chart-axis)",fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"var(--chart-axis)",fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke="#f43f5e" strokeWidth={2} fill="url(#rG)" dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} fill="url(#eG)" dot={false} />
              <Area type="monotone" dataKey="profit"   name="Profit"   stroke="#10b981" strokeWidth={2} fill="url(#pG)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Weekly Bookings */}
        <div className="glass-card p-6 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
            </div>
          )}
          <h2 className="card-title mb-0.5">Weekly Bookings</h2>
          <p className="card-subtitle mb-4">Appointments vs walk-ins</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill:"var(--chart-axis)",fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"var(--chart-axis)",fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="bookings" name="Bookings" fill="#f43f5e" radius={[4,4,0,0]} />
              <Bar dataKey="walkins"  name="Walk-ins" fill="#a855f7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Revenue */}
        <div className="glass-card p-6 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
            </div>
          )}
          <h2 className="card-title mb-4">Revenue by Service</h2>
          {serviceRevenue.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              No service sales in this period
            </div>
          ) : (
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {serviceRevenue.map((s: any, i: number) => {
                const max = Math.max(...serviceRevenue.map((x: any)=>x.revenue), 1);
                const color = SERVICE_COLORS[s.name] ?? "#6b7280";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium" style={{ color:"var(--text-secondary)" }}>{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${s.growth >= 0 ? "text-emerald-500" : "text-rose-400"}`}>
                          {s.growth >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                          {Math.abs(s.growth)}%
                        </span>
                        <span className="text-xs font-bold" style={{ color:"var(--text-primary)" }}>₹{s.revenue.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${(s.revenue/max)*100}%`, background:`linear-gradient(90deg,${color},${color}70)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="glass-card p-6 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
            </div>
          )}
          <h2 className="card-title mb-4">Staff Performance</h2>
          {staffPerformance.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              No staff bookings in this period
            </div>
          ) : (
            <div className="space-y-5 max-h-[220px] overflow-y-auto pr-1">
              {staffPerformance.map((s: any, i: number) => {
                const maxBookings = Math.max(...staffPerformance.map((x: any)=>x.bookings), 1);
                const color = STAFF_COLORS[i % STAFF_COLORS.length];
                const initials = s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background:`${color}18`, color:color }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color:"var(--text-primary)" }}>{s.name}</span>
                        <span className="text-xs font-bold" style={{ color:color }}>₹{s.revenue.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1">
                          <div className="progress-fill" style={{ width:`${(s.bookings/maxBookings)*100}%`, background:`linear-gradient(90deg,${color},${color}70)` }} />
                        </div>
                        <span className="text-[11px] flex-shrink-0" style={{ color:"var(--text-muted)" }}>{s.bookings}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
