"use client";

import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TIME_SLOTS = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"];

const staffMembers = ["All Staff", "Maria K.", "Jana L.", "Priya S.", "Rina D."];

const appointments = [
  { id: 1, client: "Sophia Chen", service: "Hair Coloring", staff: "Maria K.", date: "2026-05-19", time: "9:00", duration: 2, status: "confirmed", avatar: "SC", color: "#f43f5e" },
  { id: 2, client: "Isabella Rose", service: "Deep Facial", staff: "Jana L.", date: "2026-05-19", time: "10:00", duration: 1, status: "in-progress", avatar: "IR", color: "#a855f7" },
  { id: 3, client: "Emma Davis", service: "Manicure", staff: "Priya S.", date: "2026-05-19", time: "11:00", duration: 1.5, status: "confirmed", avatar: "ED", color: "#06b6d4" },
  { id: 4, client: "Olivia Martin", service: "Waxing", staff: "Maria K.", date: "2026-05-19", time: "13:00", duration: 1, status: "pending", avatar: "OM", color: "#fbbf24" },
  { id: 5, client: "Zara Ahmed", service: "Hair Cut", staff: "Jana L.", date: "2026-05-19", time: "14:00", duration: 1, status: "confirmed", avatar: "ZA", color: "#10b981" },
  { id: 6, client: "Priya Patel", service: "Anti-Aging Facial", staff: "Jana L.", date: "2026-05-19", time: "15:30", duration: 1.5, status: "confirmed", avatar: "PP", color: "#f97316" },
  { id: 7, client: "Nadia Kim", service: "Bridal Package", staff: "Maria K.", date: "2026-05-20", time: "9:00", duration: 5, status: "confirmed", avatar: "NK", color: "#fbbf24" },
  { id: 8, client: "Sofia Lopez", service: "Gel Manicure", staff: "Priya S.", date: "2026-05-20", time: "11:00", duration: 1, status: "pending", avatar: "SL", color: "#ec4899" },
  { id: 9, client: "Aisha Khan", service: "Hair Cut & Style", staff: "Maria K.", date: "2026-05-21", time: "10:00", duration: 1, status: "cancelled", avatar: "AK", color: "#6b7280" },
  { id: 10, client: "Emma Davis", service: "Body Waxing", staff: "Priya S.", date: "2026-05-22", time: "14:00", duration: 1.5, status: "confirmed", avatar: "ED", color: "#06b6d4" },
];

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "in-progress": { label: "In Progress", icon: Loader2, color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  pending: { label: "Pending", icon: AlertCircle, color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function AppointmentsPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedStaff, setSelectedStaff] = useState("All Staff");
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const getApptsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
  const dayAppointments = appointments.filter(a => a.date === selectedDateStr);

  const timeToIndex = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h - 9) * 2 + m / 30;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-400" />
            Appointments
          </h1>
          <p className="page-subtitle">{appointments.length} total · {appointments.filter(a => a.status === "confirmed").length} confirmed</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
            {["calendar", "list"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`period-pill rounded-none border-none capitalize ${view === v ? "active" : ""}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = appointments.filter(a => a.status === key).length;
          return (
            <div key={key} className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                <Icon className="w-5 h-5" style={{ color: cfg.color }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="glass-card p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.08]">
              <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.08]">
              <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = day === selectedDate;
              const dayAppts = getApptsForDate(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className="relative flex flex-col items-center justify-center h-10 rounded-xl text-sm font-medium transition-all hover:bg-[var(--bg-card)]"
                  style={{
                    background: isSelected ? "linear-gradient(135deg, #f43f5e, #e11d48)" : isToday ? "rgba(244,63,94,0.1)" : "transparent",
                    color: isSelected ? "white" : isToday ? "#fb7185" : "var(--text-secondary)",
                    boxShadow: isSelected ? "0 4px 12px rgba(244,63,94,0.4)" : "none",
                  }}
                >
                  {day}
                  {dayAppts.length > 0 && !isSelected && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {dayAppts.slice(0, 3).map((a, i) => (
                        <div key={i} className="w-1 h-1 rounded-full" style={{ background: a.color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Staff Filter */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Filter by Staff</p>
            <div className="flex flex-wrap gap-2">
              {staffMembers.map((staff) => (
                <button
                  key={staff}
                  onClick={() => setSelectedStaff(staff)}
                  className={`filter-pill text-xs px-3 py-1.5 ${selectedStaff === staff ? "active" : ""}`}
                >
                  {staff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Day Timeline / Schedule */}
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                {MONTHS[currentMonth]} {selectedDate}, {currentYear}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {dayAppointments.length} appointments scheduled
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search..." className="input-field pl-9 py-2 text-xs" style={{ minWidth: "160px" }} />
            </div>
          </div>

          {dayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
              <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No appointments for this day</p>
              <button className="btn-primary mt-4 text-xs px-4 py-2">
                <Plus className="w-3.5 h-3.5" /> Schedule Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
              {dayAppointments.map((appt) => {
                const StatusIcon = statusConfig[appt.status].icon;
                return (
                  <div
                    key={appt.id}
                    className="flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-[var(--bg-card)] transition-all group"
                    style={{
                      border: `1px solid ${appt.color}20`,
                      background: `${appt.color}06`,
                    }}
                  >
                    {/* Time */}
                    <div className="text-center flex-shrink-0 w-14">
                      <p className="text-sm font-bold" style={{ color: appt.color }}>{appt.time}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{appt.duration}h</p>
                    </div>

                    {/* Divider */}
                    <div className="w-px self-stretch" style={{ background: `${appt.color}40` }} />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{appt.client}</p>
                          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                            <Scissors className="w-3 h-3" />
                            {appt.service} · {appt.staff}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig[appt.status].color }} />
                          <span className="text-[11px] font-medium" style={{ color: statusConfig[appt.status].color }}>
                            {statusConfig[appt.status].label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div
                      className="avatar text-sm flex-shrink-0"
                      style={{ background: `${appt.color}20`, color: appt.color, border: `1px solid ${appt.color}30` }}
                    >
                      {appt.avatar}
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
