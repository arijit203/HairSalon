"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, User, Phone, Scissors, Search, Plus, ChevronDown,
  CalendarDays, Tag, Percent, Check, Loader2,
  ChevronRight, AlertCircle, Clock, Printer,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  category: string;
  price: number | string;
  discountPrice?: number | string | null;
  duration: number;
  isPopular: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string; // YYYY-MM-DD
  onCreated?: () => void;
  editingGroup?: any;
}

// ─── Time Slots ───────────────────────────────────────────────────────────────

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "client" | "service" | "schedule" | "pricing";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "client",   label: "Client",   icon: User },
  { id: "service",  label: "Service",  icon: Scissors },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "pricing",  label: "Pricing",  icon: Tag },
];

// Helper to get current local time in HH:MM format
const getCurrentTimeHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

// Helper to get current local date in YYYY-MM-DD format
const getLocalDateStr = () => {
  const local = new Date();
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingModal({ open, onClose, defaultDate, onCreated, editingGroup }: BookingModalProps) {
  const { success, error } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("client");

  // Client info
  const [clientName, setClientName]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Client suggestions for autofill
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<"name" | "phone" | null>(null);

  const fetchSuggestions = async (searchStr: string, field: "name" | "phone") => {
    if (searchStr.trim().length >= 2) {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(searchStr)}&limit=5`);
        const data = await res.json();
        if (data.data) {
          setSuggestions(data.data);
          setActiveSearchField(field);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSearchField(null);
    }
  };

  const handleSelectSuggestion = (client: any) => {
    setClientName(client.name || "");
    setClientPhone(client.phone || "");
    setClientEmail(client.email || "");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSearchField(null);
  };

  // Service selection
  const [services, setServices]           = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  // Inline new-service form
  const [showNewService, setShowNewService]   = useState(false);
  const [newSvcName, setNewSvcName]           = useState("");
  const [newSvcCategory, setNewSvcCategory]   = useState("");
  const [newSvcPrice, setNewSvcPrice]         = useState("");
  const [newSvcDuration, setNewSvcDuration]   = useState("60");
  const [creatingService, setCreatingService] = useState(false);

  // Schedule
  const [staffList, setStaffList]       = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [date, setDate]   = useState(defaultDate ?? getLocalDateStr());
  const [time, setTime]   = useState(""); // Default to empty string for "Auto-calculate"
  const [endTime, setEndTime] = useState(() => getCurrentTimeHHMM());
  const [currentTime, setCurrentTime] = useState("");
  const [notes, setNotes] = useState("");

  // Pricing
  const [salePrice, setSalePrice]     = useState("");
  const [discountPct, setDiscountPct] = useState("0");

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Booking confirmation / receipt print state
  const [createdBooking, setCreatedBooking] = useState<{
    clientName: string;
    clientPhone: string;
    services: Service[];
    staffName: string;
    date: string;
    time: string;
    endTime: string;
    salePrice: number;
    discountPct: number;
    finalPrice: number;
  } | null>(null);

  // ── Load data when modal opens ─────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const cur = getCurrentTimeHHMM();
    setCurrentTime(cur);
    // Reset tab
    setActiveTab("client");

    // Load services
    setServicesLoading(true);
    fetch("/api/services?limit=100")
      .then(r => r.json())
      .then(d => { if (d.data) setServices(d.data); })
      .catch(() => {})
      .finally(() => setServicesLoading(false));

    // Load staff
    setStaffLoading(true);
    fetch("/api/staff?limit=100")
      .then(r => r.json())
      .then(d => { if (d.data) setStaffList(d.data); })
      .catch(() => {})
      .finally(() => setStaffLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editingGroup) {
      setClientName(editingGroup.client?.name || "");
      setClientPhone(editingGroup.client?.phone || "");
      setClientEmail(editingGroup.client?.email || "");
      setDate(editingGroup.date);
      setTime(editingGroup.startTime || "");
      setEndTime(editingGroup.endTime || "");
      setNotes(editingGroup.notes || "");
    } else {
      setClientName(""); setClientPhone(""); setClientEmail("");
      setSelectedServices([]);
      setSelectedStaff(null);
      setDate(defaultDate ?? getLocalDateStr());
      setTime(""); 
      setEndTime(currentTime || getCurrentTimeHHMM());
      setNotes("");
      setSalePrice(""); setDiscountPct("0");
    }
  }, [open, editingGroup, defaultDate, currentTime]);

  useEffect(() => {
    if (!open) return;
    const isFuture = date > getLocalDateStr();
    if (isFuture) {
      if (endTime === currentTime) {
        setEndTime("");
      }
    } else {
      if (endTime === "") {
        setEndTime(currentTime || getCurrentTimeHHMM());
      }
    }
  }, [date, open, currentTime]);

  useEffect(() => {
    if (open && editingGroup && staffList.length > 0 && editingGroup.staff) {
      const match = staffList.find(s => s.id === editingGroup.staff.id);
      if (match) setSelectedStaff(match);
    }
  }, [open, editingGroup, staffList]);

  useEffect(() => {
    if (open && editingGroup && services.length > 0 && editingGroup.appointments) {
      const apptServiceIds = editingGroup.appointments.map((a: any) => a.service.id);
      const matches = services.filter(s => apptServiceIds.includes(s.id));
      setSelectedServices(matches);
      
      const actualTotalPrice = editingGroup.appointments.reduce((sum: number, a: any) => sum + Number(a.price), 0);
      const listPriceSum = matches.reduce((sum, s) => sum + Number(s.price), 0);
      if (actualTotalPrice < listPriceSum && listPriceSum > 0) {
        const calculatedDiscountPct = Math.round(((listPriceSum - actualTotalPrice) / listPriceSum) * 100);
        setSalePrice(String(listPriceSum));
        setDiscountPct(String(calculatedDiscountPct));
      } else {
        setSalePrice(String(actualTotalPrice));
        setDiscountPct("0");
      }
    }
  }, [open, editingGroup, services]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const groupedServices = useMemo(() => {
    const filtered = services.filter(s =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(serviceSearch.toLowerCase())
    );
    return filtered.reduce<Record<string, Service[]>>((acc, s) => {
      acc[s.category] = acc[s.category] ?? [];
      acc[s.category].push(s);
      return acc;
    }, {});
  }, [services, serviceSearch]);

  const salePriceNum  = parseFloat(salePrice)  || 0;
  const discountNum   = parseFloat(discountPct) || 0;
  const discountAmt   = Math.round(salePriceNum * discountNum / 100);
  const finalPrice    = Math.max(0, salePriceNum - discountAmt);

  // ── Inline service creation ────────────────────────────────────────────────

  const handleCreateService = async () => {
    if (!newSvcName || !newSvcCategory || !newSvcPrice) {
      error("Please fill in service name, category, and price.");
      return;
    }
    setCreatingService(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     newSvcName,
          category: newSvcCategory,
          price:    parseFloat(newSvcPrice),
          duration: parseInt(newSvcDuration) || 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create service");

      const newSvc: Service = data.data;
      setServices(prev => [newSvc, ...prev]);
      setSelectedServices(prev => {
        const next = [...prev, newSvc];
        const sumPrice = next.reduce((sum, s) => sum + Number(s.price), 0);
        setSalePrice(String(sumPrice));
        setDiscountPct("0");
        return next;
      });
      setShowNewService(false);
      setNewSvcName(""); setNewSvcCategory(""); setNewSvcPrice(""); setNewSvcDuration("60");
      success(`"${newSvc.name}" created & selected!`);
    } catch (e: any) {
      error(e.message ?? "Error creating service");
    } finally {
      setCreatingService(false);
    }
  };

  // ── Form submission ────────────────────────────────────────────────────────

  const handlePrintReceipt = (bookingDetails: typeof createdBooking) => {
    if (!bookingDetails) return;
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const servicesHtml = bookingDetails.services.map(s => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>${s.name}</span>
        <span>₹${Number(s.price).toFixed(2)}</span>
      </div>
    `).join("");

    const discountHtml = bookingDetails.discountPct > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Discount (${bookingDetails.discountPct}%)</span>
        <span>-₹${(bookingDetails.salePrice * bookingDetails.discountPct / 100).toFixed(2)}</span>
      </div>
    ` : "";

    const timeStr = bookingDetails.time 
      ? `${bookingDetails.time} - ${bookingDetails.endTime}`
      : `Ends at ${bookingDetails.endTime}`;

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
          
          <div><strong>Date:</strong> ${bookingDetails.date}</div>
          <div><strong>Time:</strong> ${timeStr}</div>
          <div><strong>Passenger:</strong> ${bookingDetails.clientName}</div>
          ${bookingDetails.clientPhone ? `<div><strong>Phone:</strong> ${bookingDetails.clientPhone}</div>` : ""}
          <div><strong>Staff:</strong> ${bookingDetails.staffName}</div>
          
          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 5px;">SERVICES</div>
          ${servicesHtml}
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>Subtotal</span>
            <span>₹${bookingDetails.salePrice.toFixed(2)}</span>
          </div>
          ${discountHtml}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 3px;">
            <span>TOTAL</span>
            <span>₹${bookingDetails.finalPrice.toFixed(2)}</span>
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

  const handleSubmit = async () => {
    const isFutureDate = date > getLocalDateStr();
    if (!clientName.trim()) { error("Client name is required."); setActiveTab("client"); return; }
    if (selectedServices.length === 0) { error("Please select at least one service.");  setActiveTab("service"); return; }
    if (!selectedStaff)     { error("Please select a staff member."); setActiveTab("schedule"); return; }
    if (!date)              { error("Please choose a date."); setActiveTab("schedule"); return; }
    if (!time && !endTime) {
      error("Either Start Time or End Time must be specified.");
      setActiveTab("schedule");
      return;
    }
    if (finalPrice <= 0)    { error("Sale price must be greater than 0."); setActiveTab("pricing"); return; }

    setSubmitting(true);
    try {
      // 1. Resolve client ID and update, or create a new client
      let clientId: string | null = null;

      if (editingGroup?.client?.id) {
        clientId = editingGroup.client.id;
      } else {
        const searchVal = clientPhone.trim() || clientEmail.trim();
        if (searchVal) {
          const searchRes = await fetch(`/api/clients?search=${encodeURIComponent(searchVal)}&limit=10`);
          const searchData = await searchRes.json();
          if (searchData.data?.length > 0) {
            const foundClient = searchData.data.find((c: any) => {
              const cleanInputPhone = clientPhone.trim().replace(/[\s+-]/g, "");
              const cleanDbPhone = c.phone?.trim().replace(/[\s+-]/g, "") || "";
              
              const phoneMatch = cleanInputPhone && (cleanDbPhone === cleanInputPhone || cleanDbPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanDbPhone));
              const emailMatch = clientEmail.trim() && c.email?.toLowerCase() === clientEmail.trim().toLowerCase();
              return phoneMatch || emailMatch;
            });
            if (foundClient) {
              clientId = foundClient.id;
            }
          }
        }
      }

      if (clientId) {
        // Update existing client details
        const updateBody: any = {
          name: clientName.trim(),
        };
        
        // Update phone (allows clearing phone as well)
        updateBody.phone = clientPhone.trim() || "";
        
        // Only update email if specified to avoid validation/unique constraints on empty emails
        if (clientEmail.trim()) {
          updateBody.email = clientEmail.trim();
        }

        const clientRes = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });
        const clientData = await clientRes.json();
        if (!clientRes.ok) throw new Error(clientData.error ?? "Could not update client details");
      } else {
        // Create new client
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:  clientName.trim(),
            phone: clientPhone.trim() || undefined,
            email: clientEmail.trim() || `walkin_${Date.now()}@wyapar.local`,
          }),
        });
        const clientData = await clientRes.json();
        if (!clientRes.ok) throw new Error(clientData.error ?? "Could not create client");
        clientId = clientData.data.id;
      }

      // 2. Create appointment
      const apptRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceIds: selectedServices.map(s => s.id),
          staffId:   selectedStaff.id,
          date,
          startTime: time || undefined,
          endTime:   isFutureDate ? undefined : endTime,
          price:     finalPrice,
          notes:     notes.trim() || undefined,
          ...(editingGroup && { deleteAppointmentIds: editingGroup.appointments.map((a: any) => a.id) }),
        }),
      });
      const apptData = await apptRes.json();
      if (!apptRes.ok) throw new Error(apptData.error ?? (editingGroup ? "Could not update booking" : "Could not create booking"));

      success(editingGroup ? "Booking updated successfully!" : "Booking created successfully!");
      window.dispatchEvent(new CustomEvent("booking-created"));
      onCreated?.();
      
      setCreatedBooking({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        services: selectedServices,
        staffName: selectedStaff.name,
        date,
        time: time || apptData.data.startTime,
        endTime: isFutureDate ? apptData.data.endTime : endTime,
        salePrice: salePriceNum,
        discountPct: discountNum,
        finalPrice,
      });
    } catch (e: any) {
      error(e.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset & Close ──────────────────────────────────────────────────────────

  const handleClose = () => {
    setClientName(""); setClientPhone(""); setClientEmail("");
    setSelectedServices([]); setServiceSearch("");
    setShowNewService(false);
    setSelectedStaff(null);
    setDate(defaultDate ?? getLocalDateStr());
    setTime(""); 
    setEndTime(getCurrentTimeHHMM());
    setNotes("");
    setSalePrice(""); setDiscountPct("0");
    setActiveTab("client");
    setCreatedBooking(null);
    onClose();
  };

  // ── Progress indicator ─────────────────────────────────────────────────────

  const isFutureDate = date > getLocalDateStr();
  const tabComplete: Record<Tab, boolean> = {
    client:   !!clientName.trim(),
    service:  selectedServices.length > 0,
    schedule: !!selectedStaff && !!date && (isFutureDate ? !!time : !!endTime),
    pricing:  finalPrice > 0,
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {createdBooking ? (
            /* Confirmation Success Screen */
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
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/25">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>

              <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}>
                {editingGroup ? "Booking Updated!" : "Booking Confirmed!"}
              </h3>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                {editingGroup ? "The appointment has been updated successfully." : "The appointment has been scheduled successfully."}
              </p>

              <div className="rounded-xl p-4 mb-6 text-left space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Passenger:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{createdBooking.clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Staff:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{createdBooking.staffName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Date & Time:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {createdBooking.date} {createdBooking.time ? `at ${createdBooking.time}` : ""} {createdBooking.endTime ? `(ends at ${createdBooking.endTime})` : ""}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-700 my-2"></div>
                <div className="flex justify-between text-sm font-bold">
                  <span style={{ color: "var(--text-secondary)" }}>Total Price:</span>
                  <span className="text-rose-400">₹{createdBooking.finalPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(createdBooking)}
                  className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt (SEZNIK 2" Thermal)
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary py-2.5 px-4 text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            /* Panel */
            <motion.div
              className="relative w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                maxHeight: "92vh",
              }}
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}>
                    {editingGroup ? "Edit Booking" : "New Booking"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {editingGroup ? "Update details for this scheduled booking" : "Schedule a walk-in or client appointment"}
                  </p>
                </div>
                <button onClick={handleClose} className="btn-icon w-8 h-8">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Tab Navigation ── */}
              <div
                className="flex gap-0 px-6 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {TABS.map(tab => {
                  const Icon    = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isDone   = tabComplete[tab.id];
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors"
                      style={{ color: isActive ? "#f43f5e" : isDone ? "var(--text-secondary)" : "var(--text-muted)" }}
                    >
                      {isDone && !isActive
                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                        : <Icon className="w-3.5 h-3.5" />
                      }
                      {tab.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500 rounded-t-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* ─── CLIENT TAB ──────────────────────────────────── */}
                {activeTab === "client" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Client Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            placeholder="e.g. Priya Sharma"
                            className="input-field pl-9"
                            value={clientName}
                            onChange={e => {
                              setClientName(e.target.value);
                              fetchSuggestions(e.target.value, "name");
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(false);
                                setActiveSearchField(null);
                              }, 200);
                            }}
                            autoFocus
                          />
                          {showSuggestions && activeSearchField === "name" && suggestions.length > 0 && (
                            <div
                              className="absolute z-[9995] left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl"
                              style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              {suggestions.map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(client)}
                                  className="w-full text-left px-4 py-2 hover:bg-white/[0.04] transition-colors flex flex-col py-2"
                                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{client.name}</span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {client.phone ? client.phone : "No phone"} {client.email ? `· ${client.email}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="tel"
                            placeholder="+91 9876543210"
                            className="input-field pl-9"
                            value={clientPhone}
                            onChange={e => {
                              setClientPhone(e.target.value);
                              fetchSuggestions(e.target.value, "phone");
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(false);
                                setActiveSearchField(null);
                              }, 200);
                            }}
                          />
                          {showSuggestions && activeSearchField === "phone" && suggestions.length > 0 && (
                            <div
                              className="absolute z-[9995] left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl"
                              style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              {suggestions.map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(client)}
                                  className="w-full text-left px-4 py-2 hover:bg-white/[0.04] transition-colors flex flex-col py-2"
                                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{client.name}</span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {client.phone ? client.phone : "No phone"} {client.email ? `· ${client.email}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Email Address <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="client@email.com"
                        className="input-field"
                        value={clientEmail}
                        onChange={e => setClientEmail(e.target.value)}
                      />
                    </div>

                    <div
                      className="p-3 rounded-xl flex items-start gap-2.5"
                      style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)" }}
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        If this client doesn't exist in the system, a new profile will be created automatically using the details above.
                      </p>
                    </div>
                  </div>
                )}

                {/* ─── SERVICE TAB ─────────────────────────────────── */}
                {activeTab === "service" && (
                  <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        placeholder="Search service name or category…"
                        className="input-field pl-9"
                        value={serviceSearch}
                        onChange={e => setServiceSearch(e.target.value)}
                      />
                    </div>

                    {/* Service list grouped by category */}
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {Object.entries(groupedServices).length === 0 && (
                          <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>No services found</p>
                        )}
                        {Object.entries(groupedServices).map(([cat, svcs]) => (
                          <div key={cat}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                              {cat}
                            </p>
                            <div className="space-y-1">
                              {svcs.map(svc => {
                                const isSelected = selectedServices.some(s => s.id === svc.id);
                                const handleToggleService = () => {
                                  let nextServices;
                                  if (isSelected) {
                                    nextServices = selectedServices.filter(s => s.id !== svc.id);
                                  } else {
                                    nextServices = [...selectedServices, svc];
                                  }
                                  setSelectedServices(nextServices);
                                  const sumPrice = nextServices.reduce((sum, s) => sum + Number(s.price), 0);
                                  setSalePrice(String(sumPrice));
                                  setDiscountPct("0");
                                };
                                return (
                                  <button
                                    type="button"
                                    key={svc.id}
                                    onClick={handleToggleService}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left"
                                    style={{
                                      background: isSelected ? "rgba(244,63,94,0.1)" : "var(--bg-card)",
                                      border: `1px solid ${isSelected ? "rgba(244,63,94,0.35)" : "var(--border-subtle)"}`,
                                    }}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: isSelected ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.04)" }}
                                      >
                                        <Scissors className="w-3.5 h-3.5" style={{ color: isSelected ? "#f43f5e" : "var(--text-muted)" }} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold" style={{ color: isSelected ? "#f43f5e" : "var(--text-primary)" }}>
                                          {svc.name}
                                        </p>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{svc.duration} min</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-bold" style={{ color: isSelected ? "#f43f5e" : "var(--text-primary)" }}>
                                        ₹{Number(svc.price).toLocaleString("en-IN")}
                                      </p>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 ml-auto mt-0.5" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Create new service toggle */}
                    <button
                      type="button"
                      onClick={() => setShowNewService(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: showNewService ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px dashed ${showNewService ? "rgba(244,63,94,0.35)" : "var(--border-subtle)"}`,
                        color: showNewService ? "#f43f5e" : "var(--text-muted)",
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showNewService ? "Cancel new service" : "Create a new service"}
                      <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showNewService ? "rotate-180" : ""}`} />
                    </button>

                    {/* Inline new service form */}
                    <AnimatePresence>
                      {showNewService && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="p-4 rounded-xl space-y-3"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
                          >
                            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>New Service Details</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Service Name *</label>
                                <input type="text" placeholder="e.g. Brazilian Blowout" className="input-field text-xs py-2"
                                  value={newSvcName} onChange={e => setNewSvcName(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Category *</label>
                                <input type="text" placeholder="e.g. Hair Care, Nails, Skin…" className="input-field text-xs py-2"
                                  value={newSvcCategory} onChange={e => setNewSvcCategory(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Price (₹) *</label>
                                <input type="number" min="0" placeholder="0.00" className="input-field text-xs py-2"
                                  value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Duration (min)</label>
                                <input type="number" min="5" step="5" className="input-field text-xs py-2"
                                  value={newSvcDuration} onChange={e => setNewSvcDuration(e.target.value)} />
                              </div>
                            </div>

                            <button
                              onClick={handleCreateService}
                              disabled={creatingService}
                              className="btn-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                              {creatingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              {creatingService ? "Creating…" : "Save & Select Service"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ─── SCHEDULE TAB ─────────────────────────────────── */}
                {activeTab === "schedule" && (
                  <div className="space-y-4">
                    {/* Staff picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Assign Stylist / Staff <span className="text-rose-500">*</span>
                      </label>
                      {staffLoading ? (
                        <div className="flex items-center gap-2 text-xs py-3" style={{ color: "var(--text-muted)" }}>
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading staff…
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {staffList.map(s => {
                            const isSelected = selectedStaff?.id === s.id;
                            const colors = ["#f43f5e","#a855f7","#06b6d4","#f59e0b","#10b981","#f97316"];
                            const clr = colors[s.name.charCodeAt(0) % colors.length];
                            const initials = s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                            return (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => setSelectedStaff(s)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                                style={{
                                  background: isSelected ? "rgba(244,63,94,0.1)" : "var(--bg-card)",
                                  border: `1px solid ${isSelected ? "rgba(244,63,94,0.35)" : "var(--border-subtle)"}`,
                                }}
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                  style={{ background: `${clr}20`, color: clr }}
                                >{initials}</div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate" style={{ color: isSelected ? "#f43f5e" : "var(--text-primary)" }}>
                                    {s.name}
                                  </p>
                                  <p className="text-[10px] truncate capitalize" style={{ color: "var(--text-muted)" }}>
                                    {s.role.replace(/_/g, " ").toLowerCase()}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Date, End Time & Start Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Appointment Date <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="date"
                            className="input-field pl-9"
                            min={getLocalDateStr()}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          End Time {!time && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          <select
                            className="input-field pl-9 appearance-none"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                          >
                            {time ? (
                              <option value="">Auto-calculate (from Start Time)</option>
                            ) : (
                              <option value="">None / Not Applicable</option>
                            )}
                            {currentTime && (
                              <option value={currentTime}>Current Time ({currentTime})</option>
                            )}
                            {TIME_SLOTS.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            {endTime && endTime !== currentTime && !TIME_SLOTS.includes(endTime) && (
                              <option value={endTime}>{endTime}</option>
                            )}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Start Time {!endTime && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          <select
                            className="input-field pl-9 appearance-none"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                          >
                            {(!isFutureDate || endTime) ? (
                              <option value="">Auto-calculate (from End Time)</option>
                            ) : (
                              <option value="">Select start time...</option>
                            )}
                            {currentTime && (
                              <option value={currentTime}>Current Time ({currentTime})</option>
                            )}
                            {TIME_SLOTS.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            {time && time !== currentTime && !TIME_SLOTS.includes(time) && (
                              <option value={time}>{time}</option>
                            )}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Notes / Special Instructions
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Any allergies, preferences, or specific requests…"
                        className="input-field resize-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* ─── PRICING TAB ─────────────────────────────────── */}
                {activeTab === "pricing" && (
                  <div className="space-y-5">
                    {/* Sale Price section */}
                    <div
                      className="rounded-xl p-4 space-y-4"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
                    >
                      <p className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        <Tag className="w-4 h-4 text-rose-400" />
                        Sale Price
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            Sale Price (₹) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                              style={{ color: "var(--text-muted)" }}
                            >₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="input-field pl-7"
                              value={salePrice}
                              onChange={e => setSalePrice(e.target.value)}
                            />
                          </div>
                          {selectedServices.length > 0 && (
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              Services list price sum: ₹{selectedServices.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            Discount on Sale Price
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="0"
                                className="input-field pl-8"
                                value={discountPct}
                                onChange={e => setDiscountPct(e.target.value)}
                              />
                            </div>
                            <div
                              className="flex items-center px-3 rounded-xl text-xs font-semibold flex-shrink-0"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-muted)",
                              }}
                            >
                              Percentage
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Price Summary */}
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.15)" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Invoice Preview
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: "var(--text-secondary)" }}>Sale Price</span>
                          <span style={{ color: "var(--text-primary)" }}>₹{salePriceNum.toLocaleString("en-IN")}</span>
                        </div>

                        {discountNum > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: "var(--text-secondary)" }}>
                              Discount ({discountNum}%)
                            </span>
                            <span className="text-emerald-400">−₹{discountAmt.toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        <div
                          className="flex items-center justify-between pt-2"
                          style={{ borderTop: "1px solid rgba(244,63,94,0.15)" }}
                        >
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
                          <span className="text-xl font-black text-rose-400">
                            ₹{finalPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Booking summary card */}
                    {(selectedServices.length > 0 || selectedStaff) && (
                      <div
                        className="rounded-xl p-4 space-y-2"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          Booking Summary
                        </p>
                        {clientName && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <User className="w-3.5 h-3.5 text-rose-400 shrink-0" /> 
                            <span><strong>Passenger:</strong> {clientName} {clientPhone && `· ${clientPhone}`}</span>
                          </div>
                        )}
                        {selectedServices.length > 0 && (
                          <div className="flex items-start gap-2 text-xs flex-col" style={{ color: "var(--text-secondary)" }}>
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3.5 h-3.5 text-rose-400" /> 
                              <span>Services ({selectedServices.length}):</span>
                            </div>
                            <ul className="pl-5 list-disc space-y-0.5">
                              {selectedServices.map(s => (
                                <li key={s.id}>
                                  {s.name} ({s.duration} min) · ₹{Number(s.price).toLocaleString("en-IN")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedStaff && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <User className="w-3.5 h-3.5 text-rose-400 shrink-0" /> 
                            <span><strong>Staff:</strong> {selectedStaff.name}</span>
                          </div>
                        )}
                        {date && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <CalendarDays className="w-3.5 h-3.5 text-rose-400" /> 
                            <span>
                              {date} {time ? `at ${time}` : ""} {endTime ? `(ends at ${endTime})` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {/* Tab navigation */}
                <div className="flex items-center gap-2">
                  {activeTab !== "client" && (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = TABS.findIndex(t => t.id === activeTab);
                        if (idx > 0) setActiveTab(TABS[idx - 1].id);
                      }}
                      className="btn-secondary py-2 px-4 text-xs font-semibold"
                    >
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleClose} className="btn-secondary py-2 px-4 text-xs font-semibold">
                    Cancel
                  </button>

                  {activeTab !== "pricing" ? (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = TABS.findIndex(t => t.id === activeTab);
                        if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
                      }}
                      className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                      {submitting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {editingGroup ? "Saving…" : "Creating…"}</>
                        : <><Check className="w-3.5 h-3.5" /> {editingGroup ? "Save Changes" : "Confirm Booking"}</>
                      }
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
