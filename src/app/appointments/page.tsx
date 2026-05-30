"use client";

import { CalendarDays, Plus, ChevronLeft, ChevronRight, Scissors, CheckCircle2, XCircle, AlertCircle, Loader2, Printer, Pencil, Trash2, X, Clock, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePaginatedApi } from "@/hooks/useApi";
import { useBooking } from "@/context/BookingContext";
import { useToast } from "@/context/ToastContext";

interface Appointment {
  id: string; startTime: string; endTime: string; date: string;
  status: string; price: string; notes?: string;
  client:  { id: string; name: string; phone?: string };
  service: { id: string; name: string; category: string };
  staff:   { id: string; name: string; role: string };
  transaction?: any;
}

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", icon: Loader2,      color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  PENDING:     { label: "Pending",     icon: AlertCircle,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  COMPLETED:   { label: "Completed",   icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  CANCELLED:   { label: "Cancelled",   icon: XCircle,      color: "#6b7280", bg: "rgba(107,114,128,0.1)"},
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDays(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirst(y: number, m: number) { return new Date(y, m, 1).getDay(); }

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function AppointmentsPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day,   setDay]   = useState(today.getDate());
  const [statusFilter, setStatusFilter] = useState("All");
  const { openBooking } = useBooking();
  const { error, success } = useToast();
  const [tick, setTick] = useState(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setIsAdmin(d.data.roleType === "staff" && d.data.staffRole === "ADMIN");
        }
      })
      .catch(() => {});

    fetch("/api/staff?limit=100")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setStaffList(d.data);
        }
      })
      .catch(() => {});

    setMounted(true);
  }, []);

  // Delete states
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDelete = (group: any) => {
    setDeletingGroup(group);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGroup) return;
    setDeleting(true);
    try {
      await Promise.all(
        deletingGroup.appointments.map((appt: any) =>
          fetch(`/api/appointments/${appt.id}`, {
            method: "DELETE",
          })
        )
      );

      success("Booking deleted successfully!");
      setDeletingGroup(null);
      setTick(t => t + 1);
    } catch (e: any) {
      error(e.message ?? "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };

  // Helper to group appointments by client, date, startTime, and endTime
  const groupAppointments = (appts: Appointment[]) => {
    const groups: Record<string, any> = {};
    appts.forEach((appt) => {
      const datePart = typeof appt.date === "string" ? appt.date.split("T")[0] : new Date(appt.date).toISOString().split("T")[0];
      const key = `${appt.client.id}_${datePart}_${appt.startTime}_${appt.endTime}`;
      if (!groups[key]) {
        groups[key] = {
          id: appt.id,
          clientId: appt.client.id,
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
    return Object.values(groups).sort((a: any, b: any) => {
      const timeA = a.endTime || a.startTime || "";
      const timeB = b.endTime || b.startTime || "";
      return timeB.localeCompare(timeA);
    });
  };

  const handlePrintReceipt = (group: any) => {
    const width = 450;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const printWindow = window.open("", "_blank", `width=${width},height=${height},left=${left},top=${top}`);
    if (!printWindow) {
      error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const transaction = group.appointments[0]?.transaction;
    const isProductSale = group.appointments.some((a: any) => a.service?.name === "Product Sale");

    const servicesHtml = isProductSale && transaction?.items && transaction.items.length > 0
      ? transaction.items.map((item: any) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${item.name} (x${item.quantity})</span>
            <span>₹${Number(item.lineTotal).toFixed(2)}</span>
          </div>
        `).join("")
      : group.appointments.map((a: any) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${a.service?.name ?? "Service"}</span>
            <span>₹${Number(a.service?.price ?? a.price).toFixed(2)}</span>
          </div>
        `).join("");

    const format24to12 = (time24: string) => {
      if (!time24) return "";
      const parts = time24.split(":");
      if (parts.length !== 2) return time24;
      let [hoursStr, minutesStr] = parts;
      let hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, "0")}:${minutesStr}${ampm}`;
    };

    const originalSubtotal = transaction ? Number(transaction.subtotal) : group.appointments.reduce((sum: number, a: any) => sum + Number(a.service?.price ?? a.price), 0);
    const paidTotal = transaction ? Number(transaction.total) : group.appointments.reduce((sum: number, a: any) => sum + Number(a.price), 0);
    const discountAmt = transaction ? Number(transaction.discountAmt) : Math.max(0, originalSubtotal - paidTotal);
    const discountPct = transaction ? Number(transaction.discountPct) : (originalSubtotal > 0 ? Math.round((discountAmt / originalSubtotal) * 100) : 0);
    const taxPct = transaction ? Number(transaction.taxPct) : 0;
    const taxAmt = transaction ? Number(transaction.taxAmt) : 0;

    const discountHtml = discountAmt > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Discount(${discountPct} %)</span>
        <span>-₹${discountAmt.toFixed(2)}</span>
      </div>
    ` : "";

    const taxHtml = taxAmt > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>GST (${taxPct}%)</span>
        <span>₹${taxAmt.toFixed(2)}</span>
      </div>
    ` : "";

    const timeStr = format24to12(group.endTime);

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
              font-size: 12px;
              font-weight: bold;
              width: 48mm;
              margin: 0 auto;
              padding: 10px 5px;
              color: #000;
              background: #fff;
              line-height: 1.3;
              text-transform: uppercase;
            }
            /* Enforce uniform font size, weight, and capitalization across all elements */
            body * {
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 12px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
            }
            /* Override for the header title */
            .header-title, .header-title * {
              font-size: 16px !important;
              font-weight: 900 !important;
            }
            .center {
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .footer {
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="center header-title">MADOE SALON</div>
          <div class="center">CE/1/B/122 Newtown Kolkata-157</div>
          <div class="center" style="margin-bottom: 5px;">+919836867607(M)</div>
          <div class="divider"></div>
          
          <div>Date: ${group.date}</div>
          <div>Time: ${timeStr}</div>
          <div>Customer: ${group.client?.name ?? "Walk-in"}</div>
          ${group.client?.phone ? `<div>Phone: ${group.client.phone}</div>` : ""}
          <div>Staff: ${staffNames}</div>
          
          <div class="divider"></div>
          <div style="margin-bottom: 5px;">${isProductSale ? "PRODUCTS" : "SERVICES"}</div>
          ${servicesHtml}
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>Subtotal</span>
            <span>₹${originalSubtotal.toFixed(2)}</span>
          </div>
          ${discountHtml}
          ${taxHtml}
          <div style="display: flex; justify-content: space-between; margin-top: 3px;">
            <span>TOTAL</span>
            <span>₹${paidTotal.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="center footer">
            Thank you for visiting!
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

  const selectedDateStr = toDateStr(year, month, day);

  const params = new URLSearchParams({ date: selectedDateStr, limit: "50" });
  if (statusFilter !== "All") params.set("status", statusFilter);

  const { data: appointments, loading } = usePaginatedApi<Appointment>(
    `/api/appointments?${params}&_t=${tick}`
  );

  const monthParams = new URLSearchParams({
    from: `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`,
    to:   `${year}-${String(month + 1).padStart(2, "0")}-${String(getDays(year, month)).padStart(2, "0")}T23:59:59Z`,
    limit: "100",
  });
  const { data: monthAppts } = usePaginatedApi<Appointment>(`/api/appointments?${monthParams}&_t=${tick}`);

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
          <h1 className="page-title flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-400" /> Appointments
          </h1>
          <p className="page-subtitle">{groupAppointments(appointments).length} booking{groupAppointments(appointments).length !== 1 ? "s" : ""} on {MONTHS[month]} {day}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
            {["All", "COMPLETED", "PENDING", "IN_PROGRESS"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`period-pill ${statusFilter === s ? "active" : ""}`}
                style={{ fontSize: "11px", padding: "4px 10px" }}>
                {s === "All" ? "All" : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => openBooking({ defaultDate: selectedDateStr, onCreated: () => setTick(t => t + 1) })}>
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="glass-card p-5 self-start">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="btn-icon w-8 h-8"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="btn-icon w-8 h-8"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array(getFirst(year, month)).fill(null).map((_, i) => <div key={i} />)}
            {Array(getDays(year, month)).fill(0).map((_, i) => {
              const d = i + 1;
              const isToday    = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
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
                {loading ? "Loading..." : `${groupAppointments(appointments).length} booking${groupAppointments(appointments).length !== 1 ? "s" : ""}`}
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
              <button className="btn-primary mt-4 text-xs px-4 py-2" onClick={() => openBooking({ defaultDate: selectedDateStr, onCreated: () => setTick(t => t + 1) })}>
                <Plus className="w-3.5 h-3.5" /> Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
              {groupAppointments(appointments).map(group => {
                const cfg = STATUS_CFG[group.status] ?? STATUS_CFG.PENDING;
                const Icon = cfg.icon;
                const colors = ["#f43f5e","#a855f7","#06b6d4","#f59e0b","#10b981","#f97316"];
                const clr = colors[group.client.name.charCodeAt(0) % colors.length];
                const totalPrice = group.appointments.reduce((sum: number, a: any) => sum + Number(a.price), 0);

                const hasProductSale = group.appointments.some((a: any) => a.service?.name === "Product Sale");

                return (
                  <div key={group.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--bg-card)] transition-all"
                    style={{ border: `1px solid ${clr}20`, background: `${clr}06` }}>
                    <div className="flex flex-col items-center flex-shrink-0 w-16">
                      <p className="text-sm font-bold" style={{ color: clr }}>{group.endTime}</p>
                      <div className="mt-4 w-full flex flex-col gap-1.5">
                        {hasProductSale ? (
                          <span className="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg w-full"
                            style={{ background: "rgba(6,182,212,0.14)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}>
                            <Package className="w-3 h-3 flex-shrink-0" /> Product
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg w-full"
                            style={{ background: "rgba(168,85,247,0.14)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
                            <Scissors className="w-3 h-3 flex-shrink-0" /> Service
                          </span>
                        )}
                        {(() => {
                          const paymentMethod = group.appointments[0]?.transaction?.paymentMethod || "ONLINE";
                          const isCash = paymentMethod === "CASH";
                          return isCash ? (
                            <span className="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg w-full"
                              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                              Cash
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg w-full"
                              style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                              Online
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="w-px self-stretch" style={{ background: `${clr}40` }} />
                    <div className="flex-1 min-w-0">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{group.client.name}</p>
                        <div className="mt-2 space-y-1.5">
                           {group.appointments.map((appt: any) => {
                             const isProductSale = appt.service?.name === "Product Sale";
                             const itemsToShow = isProductSale && appt.transaction?.items && appt.transaction.items.length > 0
                               ? appt.transaction.items.map((item: any) => `${item.name} (x${item.quantity})`).join(", ")
                               : appt.service?.name;
                             return (
                               <div key={appt.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                 <div className="flex items-center gap-2 min-w-0">
                                   <div className="truncate">
                                     <span className="font-medium text-[var(--text-primary)]">{itemsToShow}</span>
                                     <span className="text-[var(--text-muted)]"> · {appt.staff?.name}</span>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                   <span className="font-semibold text-[var(--text-primary)]">₹{Number(appt.price).toLocaleString("en-IN")}</span>
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                      <p className="text-xs font-semibold mt-2.5" style={{ color: clr }}>Total: ₹{totalPrice.toLocaleString("en-IN")}</p>
                    </div>
                    
                    {/* Side-by-side Status & Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-center">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 mr-1"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon className="w-3 h-3 shrink-0" />
                        {cfg.label}
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBooking({ editingGroup: group, onCreated: () => setTick(t => t + 1) });
                            }}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors flex items-center justify-center"
                            title="Edit Booking"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDelete(group);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex items-center justify-center"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
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
          )}
        </div>
      </div>

      {/* Delete Booking Modal */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {deletingGroup && (
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
              <motion.div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !deleting && setDeletingGroup(null)}
              />

              <motion.div
                className="relative w-full max-w-md flex flex-col rounded-2xl overflow-hidden p-6 text-center"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/25">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>

                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  Delete Booking?
                </h3>
                <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                  Are you sure you want to permanently delete the booking for <strong className="text-rose-400">{deletingGroup.client?.name}</strong> with <strong className="text-rose-400">{deletingGroup.appointments.length}</strong> service{deletingGroup.appointments.length > 1 ? "s" : ""}? This action cannot be undone.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingGroup(null)}
                    disabled={deleting}
                    className="btn-secondary py-2.5 px-4 text-xs font-semibold flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="btn-primary py-2.5 px-4 text-xs font-semibold flex-1 bg-red-600 hover:bg-red-700 border-red-500/50 flex items-center justify-center gap-1.5"
                  >
                    {deleting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                    ) : (
                      "Delete Booking"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
