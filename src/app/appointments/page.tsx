"use client";

import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Scissors, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePaginatedApi } from "@/hooks/useApi";

interface Appointment {
  id: string; startTime: string; endTime: string; date: string;
  status: string; price: string; notes?: string;
  client:  { id: string; name: string; phone?: string };
  service: { id: string; name: string; duration: number; category: string };
  staff:   { id: string; name: string; role: string };
}

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CONFIRMED:   { label: "Confirmed",   icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  IN_PROGRESS: { label: "In Progress", icon: Loader2,      color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  PENDING:     { label: "Pending",     icon: AlertCircle,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  COMPLETED:   { label: "Completed",   icon: CheckCircle2, color: "#06b6d4", bg: "rgba(6,182,212,0.1)"  },
  CANCELLED:   { label: "Cancelled",   icon: XCircle,      color: "#6b7280", bg: "rgba(107,114,128,0.1)"},
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDays(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirst(y: number, m: number) { return new Date(y, m, 1).getDay(); }

export default function AppointmentsPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day,   setDay]   = useState(today.getDate());
  const [statusFilter, setStatusFilter] = useState("All");

  const selectedDateStr = toDateStr(year, month, day);

  const params = new URLSearchParams({ date: selectedDateStr, limit: "50" });
  if (statusFilter !== "All") params.set("status", statusFilter);

  const { data: appointments, loading } = usePaginatedApi<Appointment>(`/api/appointments?${params}`);

  // For calendar dots — fetch the whole month
  const monthParams = new URLSearchParams({
    from: `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`,
    to:   `${year}-${String(month + 1).padStart(2, "0")}-${String(getDays(year, month)).padStart(2, "0")}T23:59:59Z`,
    limit: "100",
  });
  const { data: monthAppts } = usePaginatedApi<Appointment>(`/api/appointments?${monthParams}`);

  const dotsByDay = monthAppts.reduce<Record<number, string[]>>((acc, a) => {
    const d = new Date(a.date).getUTCDate();
    acc[d] = acc[d] ?? [];
    acc[d].push(STATUS_CFG[a.status]?.color ?? "#6b7280");
    return acc;
  }, {});

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><CalendarDays className="w-5 h-5 text-rose-400" /> Appointments</h1>
          <p className="page-subtitle">{appointments.length} appointments on {MONTHS[month]} {day}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
            {["All", "CONFIRMED", "PENDING", "IN_PROGRESS"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`period-pill ${statusFilter === s ? "active" : ""}`}
                style={{ fontSize: "11px", padding: "4px 10px" }}>
                {s === "All" ? "All" : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <button className="btn-primary"><Plus className="w-4 h-4" /> New Booking</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="btn-icon w-8 h-8"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="btn-icon w-8 h-8"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array(getFirst(year, month)).fill(null).map((_, i) => <div key={i} />)}
            {Array(getDays(year, month)).fill(0).map((_, i) => {
              const d = i + 1;
              const isToday   = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = d === day;
              const dots = dotsByDay[d] ?? [];
              return (
                <button key={d} onClick={() => setDay(d)}
                  className="relative flex flex-col items-center justify-center h-10 rounded-xl text-sm font-medium transition-all hover:bg-[var(--bg-card)]"
                  style={{
                    background: isSelected ? "linear-gradient(135deg,#f43f5e,#e11d48)" : isToday ? "rgba(244,63,94,0.1)" : "transparent",
                    color: isSelected ? "white" : isToday ? "#fb7185" : "var(--text-secondary)",
                    boxShadow: isSelected ? "0 4px 12px rgba(244,63,94,0.4)" : "none",
                  }}>
                  {d}
                  {dots.length > 0 && !isSelected && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dots.slice(0, 3).map((c, j) => <div key={j} className="w-1 h-1 rounded-full" style={{ background: c }} />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day schedule */}
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{MONTHS[month]} {day}, {year}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {loading ? "Loading..." : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }}>
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 rounded bg-white/[0.06]" />
                    <div className="w-48 h-3 rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--text-muted)" }}>
              <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No appointments for this day</p>
              <button className="btn-primary mt-4 text-xs px-4 py-2"><Plus className="w-3.5 h-3.5" /> Schedule</button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
              {appointments.map(appt => {
                const cfg = STATUS_CFG[appt.status] ?? STATUS_CFG.PENDING;
                const Icon = cfg.icon;
                const colors = ["#f43f5e","#a855f7","#06b6d4","#f59e0b","#10b981","#f97316"];
                const clr = colors[appt.client.name.charCodeAt(0) % colors.length];
                const initials = appt.client.name.split(" ").map(w => w[0]).join("").slice(0,2);
                return (
                  <div key={appt.id} className="flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-[var(--bg-card)] transition-all"
                    style={{ border: `1px solid ${clr}20`, background: `${clr}06` }}>
                    <div className="text-center flex-shrink-0 w-14">
                      <p className="text-sm font-bold" style={{ color: clr }}>{appt.startTime}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{appt.service.duration}m</p>
                    </div>
                    <div className="w-px self-stretch" style={{ background: `${clr}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{appt.client.name}</p>
                          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                            <Scissors className="w-3 h-3" />{appt.service.name} · {appt.staff.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold mt-1" style={{ color: clr }}>₹{Number(appt.price).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="avatar w-9 h-9 text-xs flex-shrink-0"
                      style={{ background: `${clr}20`, color: clr, border: `1px solid ${clr}30` }}>{initials}</div>
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
