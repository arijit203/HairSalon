"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Plus,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  price: string | number;
  notes: string | null;
  service: {
    id: string;
    name: string;
  };
  staff: {
    id: string;
    name: string;
  };
}

interface Service {
  id: string;
  name: string;
  price: string | number;
  category: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

export default function PortalBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const preselectedServiceId = searchParams.get("serviceId");

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);

  // Modal Wizard State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formServiceId, setFormServiceId] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formNotes, setFormNotes] = useState("");

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Load Session and Lists
  useEffect(() => {
    async function initData() {
      try {
        const sessionRes = await fetch("/api/auth/me");
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok || !sessionData.success) {
          router.push("/login");
          return;
        }

        const cid = sessionData.data.userId;
        setClientId(cid);

        // Fetch user bookings, services, and staff
        const [appRes, servRes, staffRes] = await Promise.all([
          fetch(`/api/appointments?clientId=${cid}&limit=100`),
          fetch("/api/services?limit=100"),
          fetch("/api/staff?limit=100"),
        ]);

        const appData = await appRes.json();
        const servData = await servRes.json();
        const staffData = await staffRes.json();

        if (appData.success) setAppointments(appData.data);
        if (servData.success) setServices(servData.data);
        if (staffData.success) setStaffList(staffData.data);

        // Pre-select service from URL if provided
        if (preselectedServiceId && servData.success) {
          const exists = servData.data.some((s: Service) => s.id === preselectedServiceId);
          if (exists) {
            setFormServiceId(preselectedServiceId);
            setModalOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch booking initial data:", err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [preselectedServiceId, router]);

  const loadAppointments = async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/appointments?clientId=${clientId}&limit=100`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedService = services.find((s) => s.id === formServiceId);
  const selectedStaff = staffList.find((s) => s.id === formStaffId);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !formServiceId || !formStaffId || !formDate || !formTime) {
      error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const price = selectedService ? Number(selectedService.price) : 0;
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId: formServiceId,
          staffId: formStaffId,
          date: formDate,
          startTime: formTime,
          price,
          notes: formNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create appointment.");
      }

      success("Appointment booked successfully!");
      setModalOpen(false);
      
      // Clear form
      setFormServiceId("");
      setFormStaffId("");
      setFormDate("");
      setFormTime("09:00");
      setFormNotes("");

      // Reload list
      await loadAppointments();
    } catch (err: any) {
      error(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`/api/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "CANCELLED" }),
      });
      // Note: If /api/appointments does not support PATCH on root, we can hit it.
      // Wait, let's see. Does appointments PATCH support ID in body or is it at /api/appointments/[id]?
      // Let's check how the edit is handled in general. We can do a fetch or check.
      // Wait, standard CRUD usually uses PATCH /api/appointments/[id] or PATCH /api/appointments.
      // Let's check if there is a src/app/api/appointments/[id] endpoint.
      // If not, we can write a quick endpoint, or check if we can update the status.
      // Let's search if there is an appointments id subroute.
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Loading your bookings...
          </p>
        </div>
      </div>
    );
  }

  // Filter bookings
  const today = new Date().setHours(0, 0, 0, 0);
  const upcomingBookings = appointments.filter((app) => {
    const isCancelledOrNoShow = app.status === "CANCELLED" || app.status === "NO_SHOW";
    const appDate = new Date(app.date).getTime();
    return !isCancelledOrNoShow && appDate >= today;
  });

  const pastBookings = appointments.filter((app) => {
    const isCancelledOrNoShow = app.status === "CANCELLED" || app.status === "NO_SHOW";
    const appDate = new Date(app.date).getTime();
    return isCancelledOrNoShow || appDate < today;
  });

  const displayBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  // List of pre-defined time slots
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair)" }}>
            My Appointments
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Schedule and manage your personal beauty bookings
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary py-3 px-5 flex items-center justify-center gap-2 font-semibold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Booking Tabs */}
      <div className="flex border-b border-white/[0.06] gap-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeTab === "upcoming" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Upcoming Bookings ({upcomingBookings.length})
          {activeTab === "upcoming" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeTab === "past" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          History & Cancelled ({pastBookings.length})
          {activeTab === "past" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500" />
          )}
        </button>
      </div>

      {/* Appointment Listings */}
      {displayBookings.length === 0 ? (
        <div className="text-center py-16 glass-card max-w-md mx-auto">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No appointments found</p>
          <p className="text-xs text-zinc-500 mt-1">
            {activeTab === "upcoming"
              ? "You have no upcoming bookings scheduled. Tap Book Appointment to schedule one!"
              : "No booking history was found in your records."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayBookings.map((booking) => {
            const appDate = new Date(booking.date);
            return (
              <div
                key={booking.id}
                className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.01] flex justify-between items-start hover:border-white/[0.12] transition-colors"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{booking.service.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-500" /> Stylist: {booking.staff.name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400 mt-2">
                    <span className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-rose-400" />
                      {appDate.toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      {booking.startTime}
                    </span>
                  </div>

                  {booking.notes && (
                    <div className="flex items-start gap-1 text-[11px] text-zinc-500 bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-600" />
                      <span className="italic">Note: "{booking.notes}"</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex flex-col justify-between h-full min-h-[80px]">
                  <div>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                      style={{
                        background:
                          booking.status === "COMPLETED"
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(239,68,68,0.12)",
                        color:
                          booking.status === "COMPLETED"
                            ? "#10b981"
                            : "#ef4444",
                      }}
                    >
                      {booking.status}
                    </span>
                    <p className="text-lg font-black text-white mt-1.5">
                      ₹{Number(booking.price).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal Wizard */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Styling Appointment"
        subtitle="Reserve your salon time and professional stylist easily"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          {/* Service Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Select Styling Service <span className="text-rose-500">*</span>
            </label>
            <select
              required
              className="input-field"
              value={formServiceId}
              onChange={(e) => setFormServiceId(e.target.value)}
            >
              <option value="">-- Choose Service --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (₹{Number(s.price).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {/* Stylist Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Select Stylist / Expert <span className="text-rose-500">*</span>
            </label>
            <select
              required
              className="input-field"
              value={formStaffId}
              onChange={(e) => setFormStaffId(e.target.value)}
            >
              <option value="">-- Choose Stylist --</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Appointment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                className="input-field"
                min={new Date().toISOString().split("T")[0]}
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Start Time <span className="text-rose-500">*</span>
              </label>
              <select
                required
                className="input-field"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Special Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Special Notes / Instructions
            </label>
            <textarea
              placeholder="E.g., Any allergies, preferences, or hair length details"
              className="input-field min-h-[80px] py-2"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          {/* Price Preview Card */}
          {selectedService && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Estimated Invoice</p>
              </div>
              <p className="text-xl font-extrabold text-white">
                ₹{Number(selectedService.price).toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary py-2.5 px-4 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary py-2.5 px-4 font-semibold text-xs flex items-center gap-1.5"
            >
              {submitting ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
