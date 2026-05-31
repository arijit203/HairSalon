"use client";

import {
  BarChart3, TrendingUp, TrendingDown, Calendar,
  Download, ArrowUp, ArrowDown, Loader2, X
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useState, useRef, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import * as XLSX from "xlsx";

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
      <p className="font-semibold mb-1" style={{ color: "#ffffff" }}>{label}</p>
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
  const [showComparison, setShowComparison] = useState(true);
  
  // Custom Date States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPeriodDates = (p: string) => {
    if (p === "Custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

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
    { label: "Net Profit Margin", value: "₹0", change: "0.0%", up: true },
    { label: "Expenses", value: "₹0", change: "0.0%", up: true },
    { label: "Customer Retention", value: "0%", change: "0.0%", up: true },
  ];

  const monthlyData = data?.revenueData ?? [];
  const weeklyData = data?.weeklyData ?? [];
  const serviceRevenue = data?.serviceRevenue ?? [];
  const staffPerformance = data?.staffStats ?? [];

  const handleExportExcel = () => {
    if (!monthlyData || monthlyData.length === 0) return;

    const exportRangeLabel = `${from.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} - ${to.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;

    const percentChange = (currentValue: number, previousValue: number) => {
      if (previousValue === 0) return 0;
      return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    };

    type ExportRow = {
      period: string;
      incomeService: number;
      incomeProduct: number;
      incomeTotal: number;
      expProduct: number;
      expStaff: number;
      expMisc: number;
      expenseTotal: number;
      netRevenue: number;
      netDiscount: number;
      netAmtSpent: number;
      netProfit: number;
      netIncome: number;
      growthRevenue: number;
      growthIncome: number;
      growthExpense: number;
      growthProfit: number;
      growthDiscount: number;
    };

    const exportRows: ExportRow[] = monthlyData.map((entry: any, index: number) => {
      const prev = index > 0 ? monthlyData[index - 1] : null;

      const incomeService = Number(entry.incomeService ?? 0);
      const incomeProduct = Number(entry.incomeProduct ?? 0);
      const incomeTotal = incomeService + incomeProduct;

      const expProduct = Number(entry.expProduct ?? 0);
      const expStaff = Number(entry.expStaff ?? 0);
      const expMisc = Number(entry.expMisc ?? 0);
      const expenseTotal = Number(entry.expenses ?? 0);

      const netRevenue = Number(entry.revenue ?? 0);
      const netDiscount = Number(entry.discount ?? 0);
      const netAmtSpent = expenseTotal;
      const netProfit = Number(entry.profit ?? 0);
      const netIncome = netProfit;

      return {
        period: entry.month || entry.label || "",
        incomeService,
        incomeProduct,
        incomeTotal,
        expProduct,
        expStaff,
        expMisc,
        expenseTotal,
        netRevenue,
        netDiscount,
        netAmtSpent,
        netProfit,
        netIncome,
        growthRevenue: prev ? percentChange(netRevenue, Number(prev.revenue ?? 0)) : 0,
        growthIncome: prev ? percentChange(incomeTotal, Number((prev.incomeService ?? 0) + (prev.incomeProduct ?? 0))) : 0,
        growthExpense: prev ? percentChange(expenseTotal, Number(prev.expenses ?? 0)) : 0,
        growthProfit: prev ? percentChange(netProfit, Number(prev.profit ?? 0)) : 0,
        growthDiscount: prev ? percentChange(netDiscount, Number(prev.discount ?? 0)) : 0,
      };
    });

    const sumRow = (selector: (row: ExportRow) => number) => exportRows.reduce((sum, row) => sum + selector(row), 0);
    const firstHalf = Math.max(1, Math.ceil(exportRows.length / 2));
    const previousRows = exportRows.slice(0, firstHalf);
    const previousSumRow = (selector: (row: ExportRow) => number) => previousRows.reduce((sum, row) => sum + selector(row), 0);

    const detailedSheetData = [
      ["Madoe Beaty Salon Detailed Monthly Export", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      [`Selected Time Range: ${exportRangeLabel}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Time Period", "Income", "", "", "Expenses", "", "", "", "Net Metrics", "", "", "", "Growth %", "", "", "", ""],
      ["", "Service (Rs)", "Product Sale (Rs)", "Total Income (Rs)", "Product Purchase (Rs)", "Staff Payment (Rs)", "Miscellaneous (Rs)", "Net Amt Spent (Rs)", "Net Revenue (Rs)", "Net Discount (Rs)", "Net Profit (Rs)", "Net Income (Rs)", "Revenue", "Income", "Expense", "Profit", "Discount"],
      ...exportRows.map((row: any) => [
        row.period,
        row.incomeService,
        row.incomeProduct,
        row.incomeTotal,
        row.expProduct,
        row.expStaff,
        row.expMisc,
        row.netAmtSpent,
        row.netRevenue,
        row.netDiscount,
        row.netProfit,
        row.netIncome,
        Number(row.growthRevenue.toFixed(2)),
        Number(row.growthIncome.toFixed(2)),
        Number(row.growthExpense.toFixed(2)),
        Number(row.growthProfit.toFixed(2)),
        Number(row.growthDiscount.toFixed(2)),
      ]),
    ];

    const detailedWorksheet = XLSX.utils.aoa_to_sheet(detailedSheetData);
    detailedWorksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 11 } },
      { s: { r: 2, c: 12 }, e: { r: 2, c: 16 } },
    ];
    detailedWorksheet["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    const metricSheetData: (string | number)[][] = [
      ["Madoe Beaty Salon Period Summary", "", "", ""],
      [`Selected Time Range: ${exportRangeLabel}`, "", "", ""],
      ["Net Metric", "Selected Period (Rs)", "Previous Period (Rs)", "Growth (%)"],
      ["Income: Service", sumRow((row) => row.incomeService), previousSumRow((row) => row.incomeService), percentChange(sumRow((row) => row.incomeService), previousSumRow((row) => row.incomeService)).toFixed(2)],
      ["Income: Product Sale", sumRow((row) => row.incomeProduct), previousSumRow((row) => row.incomeProduct), percentChange(sumRow((row) => row.incomeProduct), previousSumRow((row) => row.incomeProduct)).toFixed(2)],
      ["Expenses: Product Purchase", sumRow((row) => row.expProduct), previousSumRow((row) => row.expProduct), percentChange(sumRow((row) => row.expProduct), previousSumRow((row) => row.expProduct)).toFixed(2)],
      ["Expenses: Staff Payment", sumRow((row) => row.expStaff), previousSumRow((row) => row.expStaff), percentChange(sumRow((row) => row.expStaff), previousSumRow((row) => row.expStaff)).toFixed(2)],
      ["Expenses: Miscellaneous", sumRow((row) => row.expMisc), previousSumRow((row) => row.expMisc), percentChange(sumRow((row) => row.expMisc), previousSumRow((row) => row.expMisc)).toFixed(2)],
      ["Net Amt Spent", sumRow((row) => row.netAmtSpent), previousSumRow((row) => row.netAmtSpent), percentChange(sumRow((row) => row.netAmtSpent), previousSumRow((row) => row.netAmtSpent)).toFixed(2)],
      ["Net Revenue", sumRow((row) => row.netRevenue), previousSumRow((row) => row.netRevenue), percentChange(sumRow((row) => row.netRevenue), previousSumRow((row) => row.netRevenue)).toFixed(2)],
      ["Net Discount", sumRow((row) => row.netDiscount), previousSumRow((row) => row.netDiscount), percentChange(sumRow((row) => row.netDiscount), previousSumRow((row) => row.netDiscount)).toFixed(2)],
      ["Net Profit", sumRow((row) => row.netProfit), previousSumRow((row) => row.netProfit), percentChange(sumRow((row) => row.netProfit), previousSumRow((row) => row.netProfit)).toFixed(2)],
      ["Net Income", sumRow((row) => row.netIncome), previousSumRow((row) => row.netIncome), percentChange(sumRow((row) => row.netIncome), previousSumRow((row) => row.netIncome)).toFixed(2)],
    ];
    const metricWorksheet = XLSX.utils.aoa_to_sheet(metricSheetData);
    metricWorksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    metricWorksheet["!cols"] = [
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
    ];

    const currencyColIndexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    currencyColIndexes.forEach((col) => {
      for (let rowIndex = 4; rowIndex < detailedSheetData.length; rowIndex++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col });
        const cell = detailedWorksheet[cellRef];
        if (cell && typeof cell.v === "number") {
          cell.z = '"₹"#,##0.00;[Red]-"₹"#,##0.00';
        }
      }
    });

    for (let rowIndex = 3; rowIndex < metricSheetData.length; rowIndex++) {
      for (let colIndex = 1; colIndex < 3; colIndex++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = metricWorksheet[cellRef];
        if (cell && typeof cell.v === "number") {
          cell.z = '"₹"#,##0.00;[Red]-"₹"#,##0.00';
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, detailedWorksheet, "Detailed Monthly");
    XLSX.utils.book_append_sheet(workbook, metricWorksheet, "Metric Rows");

    XLSX.writeFile(workbook, `Madoe_Beaty_Salon_Analytics_${period}.xlsx`);
  };

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
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
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
          
          <div className="relative" ref={datePickerRef}>
            <button 
              className={`btn-secondary ${period === "Custom" ? "!border-rose-400 !bg-rose-50/50" : ""}`}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="w-4 h-4" />
              {period === "Custom" && customFrom && customTo 
                ? `${new Date(customFrom).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} - ${new Date(customTo).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`
                : "Custom"}
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 p-4 rounded-2xl z-50 w-64 shadow-xl" 
                   style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-sm">Select Custom Range</h3>
                  <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                    <input 
                      type="date" 
                      className="input-field w-full text-sm"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                    <input 
                      type="date" 
                      className="input-field w-full text-sm"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      className="btn-secondary flex-1 py-2 text-xs"
                      onClick={() => {
                        setCustomFrom("");
                        setCustomTo("");
                        setPeriod("3M");
                        setShowDatePicker(false);
                      }}
                    >
                      Clear
                    </button>
                    <button 
                      className="btn-primary flex-1 py-2 text-xs"
                      disabled={!customFrom || !customTo}
                      onClick={() => {
                        if (customFrom && customTo) {
                          setPeriod("Custom");
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            className={`btn-secondary flex items-center gap-2 ${showComparison ? "!border-rose-500/30 !bg-rose-500/5 text-rose-500" : ""}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Compare</span>
            <div 
              className={`w-6 h-3 rounded-full p-[1px] transition-colors relative flex items-center ${showComparison ? "bg-rose-500" : "bg-gray-300 dark:bg-zinc-700"}`}
            >
              <div 
                className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${showComparison ? "translate-x-3" : "translate-x-0"}`}
              />
            </div>
          </button>

          <button className="btn-primary" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> 
            Export Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k: any, i: number) => {
          const displayValue = (() => {
            if (showComparison && k.difference !== undefined) {
              const diffVal = k.difference;
              const absVal = Math.abs(diffVal);
              const sign = diffVal > 0 ? "+" : diffVal < 0 ? "-" : "";
              if (k.type === "currency") {
                return `${sign}₹${absVal.toLocaleString("en-IN")}`;
              } else if (k.type === "percentage") {
                return `${sign}${absVal.toFixed(1)}%`;
              }
            }
            return k.value;
          })();
          return (
            <div key={i} className="glass-card p-6 relative overflow-hidden flex flex-col justify-between">
              {loading && (
                <div className="absolute inset-0 bg-black/5 animate-pulse" />
              )}
              <div className={showComparison ? "mb-4" : ""}>
                <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color:"var(--text-primary)" }}>{displayValue}</p>
              </div>
              {showComparison && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${k.up ? "text-emerald-500" : "text-rose-400"}`}>
                  {k.change.startsWith("-") ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                  {k.change.replace(/[+-]/g, "")} vs last period
                </div>
              )}
            </div>
          );
        })}
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
                        {showComparison && (
                          <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${s.growth >= 0 ? "text-emerald-500" : "text-rose-400"}`}>
                            {s.growth >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                            {Math.abs(s.growth)}%
                          </span>
                        )}
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
