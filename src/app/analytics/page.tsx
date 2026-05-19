"use client";

import {
  BarChart3, TrendingUp, TrendingDown, Calendar,
  Download, ArrowUp,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { month: "Jan", revenue: 42000, expenses: 18000, profit: 24000 },
  { month: "Feb", revenue: 38500, expenses: 16500, profit: 22000 },
  { month: "Mar", revenue: 51000, expenses: 21000, profit: 30000 },
  { month: "Apr", revenue: 47800, expenses: 19500, profit: 28300 },
  { month: "May", revenue: 63200, expenses: 24000, profit: 39200 },
  { month: "Jun", revenue: 58900, expenses: 22500, profit: 36400 },
  { month: "Jul", revenue: 72400, expenses: 27000, profit: 45400 },
];

const weeklyData = [
  { day: "Mon", bookings: 18, walkins: 5  },
  { day: "Tue", bookings: 22, walkins: 7  },
  { day: "Wed", bookings: 28, walkins: 9  },
  { day: "Thu", bookings: 24, walkins: 6  },
  { day: "Fri", bookings: 34, walkins: 12 },
  { day: "Sat", bookings: 42, walkins: 18 },
  { day: "Sun", bookings: 30, walkins: 10 },
];

const serviceRevenue = [
  { name: "Hair Services", revenue: 128000, color: "#f43f5e", growth: 18.2  },
  { name: "Facial & Skin", revenue: 89400,  color: "#a855f7", growth: 24.5  },
  { name: "Nail Care",     revenue: 64800,  color: "#fbbf24", growth: 12.1  },
  { name: "Body & Wax",   revenue: 43200,  color: "#06b6d4", growth: -3.2  },
  { name: "Packages",     revenue: 38900,  color: "#10b981", growth: 31.8  },
];

const staffPerformance = [
  { name: "Maria K.", bookings: 142, revenue: 186400, color: "#f43f5e" },
  { name: "Jana L.",  bookings: 128, revenue: 142800, color: "#a855f7" },
  { name: "Priya S.", bookings: 116, revenue: 98600,  color: "#fbbf24" },
  { name: "Rina D.",  bookings: 94,  revenue: 76200,  color: "#06b6d4" },
];

const kpis = [
  { label: "Total Revenue (YTD)", value: "₹3,74,800", change: "+22.4%", up: true  },
  { label: "Net Profit Margin",   value: "58.2%",      change: "+4.1%",  up: true  },
  { label: "Customer Retention",  value: "84%",         change: "+2.8%",  up: true  },
  { label: "Avg. Ticket Size",    value: "₹2,140",      change: "-1.2%",  up: false },
];

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
            {typeof p.value === "number" && p.value > 999 ? `₹${p.value.toLocaleString()}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
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
            {["7D","1M","3M","6M","1Y"].map((p, i) => (
              <button key={p} className={`period-pill rounded-none border-none ${i===2?"active":""}`}>{p}</button>
            ))}
          </div>
          <button className="btn-secondary"><Calendar className="w-4 h-4" />Custom</button>
          <button className="btn-primary"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>{k.label}</p>
            <p className="text-2xl font-bold mb-2" style={{ color:"var(--text-primary)" }}>{k.value}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold ${k.up?"text-emerald-500":"text-rose-400"}`}>
              {k.up ? <ArrowUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {k.change} vs last period
            </div>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="card-title">Revenue vs Expenses vs Profit</h2>
            <p className="card-subtitle">Monthly breakdown</p>
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
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Weekly Bookings */}
        <div className="glass-card p-6">
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
        <div className="glass-card p-6">
          <h2 className="card-title mb-4">Revenue by Service</h2>
          <div className="space-y-4">
            {serviceRevenue.map((s, i) => {
              const max = Math.max(...serviceRevenue.map(x=>x.revenue));
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color:"var(--text-secondary)" }}>{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${s.growth>0?"text-emerald-500":"text-rose-400"}`}>
                        {s.growth>0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                        {Math.abs(s.growth)}%
                      </span>
                      <span className="text-xs font-bold" style={{ color:"var(--text-primary)" }}>₹{(s.revenue/1000).toFixed(0)}K</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${(s.revenue/max)*100}%`, background:`linear-gradient(90deg,${s.color},${s.color}70)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="glass-card p-6">
          <h2 className="card-title mb-4">Staff Performance</h2>
          <div className="space-y-5">
            {staffPerformance.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background:`${s.color}18`, color:s.color }}>
                  {s.name[0]}{s.name.split(" ")[1][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-semibold" style={{ color:"var(--text-primary)" }}>{s.name}</span>
                    <span className="text-xs font-bold" style={{ color:s.color }}>₹{(s.revenue/1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width:`${(s.bookings/142)*100}%`, background:`linear-gradient(90deg,${s.color},${s.color}70)` }} />
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color:"var(--text-muted)" }}>{s.bookings}</span>
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
