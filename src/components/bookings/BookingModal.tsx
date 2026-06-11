"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, User, Phone, Scissors, Search, Plus, ChevronDown,
  CalendarDays, Tag, Percent, Check, Loader2,
  ChevronRight, AlertCircle, Clock, Printer, Package,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { isComboCategory, getComboSummary, type Service } from "@/lib/services";


interface Product {
  id: string;
  name: string;
  category: string[];
  price: number | string;
  costPrice?: number | string;
  stock: number;
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



// Helper to get current local time in HH:MM format for Asia/Kolkata
const getCurrentTimeHHMM = () => {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to get current local date in YYYY-MM-DD format for Asia/Kolkata
const getLocalDateStr = () => {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

// Converts "HH:mm" to "hh:mm AM/PM"
const format24to12 = (time24: string) => {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length !== 2) return time24;
  let [hoursStr, minutesStr] = parts;
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

// Converts "hh:mm AM/PM" (or shorthand/custom inputs) to "HH:mm"
// Returns "" for invalid times (e.g. 10:65, 13 AM).
const format12to24 = (time12: string) => {
  let cleaned = time12.trim().toUpperCase();
  if (!cleaned) return "";

  // Check for auto-calculate or special values
  if (cleaned.startsWith("AUTO") || cleaned.startsWith("NONE") || cleaned.startsWith("NOT APPLICABLE")) {
    return "";
  }

  // 1. Standard hh:mm AM/PM format (e.g. "10:30 AM")
  let match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3];
    // Validate range
    if (hours < 1 || hours > 12 || mins < 0 || mins > 59) return "";
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${match[2]}`;
  }

  // 2. hh:mm without AM/PM — infer from salon hours
  match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    if (mins < 0 || mins > 59) return "";
    // 24-hour pass-through
    if (hours >= 12 && hours < 24) return `${String(hours).padStart(2, "0")}:${match[2]}`;
    if (hours >= 0 && hours < 24) {
      let inferredAmpm = "AM";
      if (hours === 12 || (hours >= 1 && hours <= 8)) inferredAmpm = "PM";
      if (inferredAmpm === "PM" && hours < 12) hours += 12;
      if (inferredAmpm === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${match[2]}`;
    }
  }

  // 3. No-colon compact format like "930 AM" or "930"
  match = cleaned.match(/^(\d{1,2})(\d{2})\s*(AM|PM)?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3];
    if (mins < 0 || mins > 59) return "";
    if (ampm) {
      if (hours < 1 || hours > 12) return "";
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${match[2]}`;
    } else {
      if (hours >= 12 && hours < 24) return `${String(hours).padStart(2, "0")}:${match[2]}`;
      if (hours >= 0 && hours < 24) {
        let inferredAmpm = "AM";
        if (hours === 12 || (hours >= 1 && hours <= 8)) inferredAmpm = "PM";
        if (inferredAmpm === "PM" && hours < 12) hours += 12;
        if (inferredAmpm === "AM" && hours === 12) hours = 0;
        return `${String(hours).padStart(2, "0")}:${match[2]}`;
      }
    }
  }

  // 4. Hour only like "9" or "9 AM"
  match = cleaned.match(/^(\d{1,2})\s*(AM|PM)?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const ampm = match[2];
    if (ampm) {
      if (hours < 1 || hours > 12) return "";
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:00`;
    } else {
      if (hours >= 12 && hours < 24) return `${String(hours).padStart(2, "0")}:00`;
      if (hours >= 0 && hours < 24) {
        let inferredAmpm = "AM";
        if (hours === 12 || (hours >= 1 && hours <= 8)) inferredAmpm = "PM";
        if (inferredAmpm === "PM" && hours < 12) hours += 12;
        if (inferredAmpm === "AM" && hours === 12) hours = 0;
        return `${String(hours).padStart(2, "0")}:00`;
      }
    }
  }

  return "";
};

// Validates and formats phone number
const validateAndFormatPhone = (phoneStr: string): { isValid: boolean; formatted: string } => {
  const cleaned = phoneStr.trim();
  if (!cleaned) return { isValid: true, formatted: "" };

  // Remove all spaces, dashes, parentheses, etc.
  const normalized = cleaned.replace(/[\s-()]/g, "");

  // If only digits were typed and it is exactly 10 digits, prepend +91
  if (/^\d{10}$/.test(normalized)) {
    return { isValid: true, formatted: `+91${normalized}` };
  }

  // If it starts with + and has a valid format (e.g. +919876543210)
  // Check if it starts with + followed by 1-4 digit country code and exactly 10 digit local phone
  const match = normalized.match(/^\+(\d{1,4})(\d{10})$/);
  if (match) {
    return { isValid: true, formatted: normalized };
  }

  // If they wrote e.g. 919876543210 (12 digits, starts with 91)
  if (/^\d{12}$/.test(normalized) && normalized.startsWith("91")) {
    return { isValid: true, formatted: `+${normalized}` };
  }

  return { isValid: false, formatted: cleaned };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingModal({ open, onClose, defaultDate, onCreated, editingGroup }: BookingModalProps) {
  const { success, error } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("client");

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [phoneDigits, setPhoneDigits] = useState(""); // only the 10-digit part
  const [clientEmail, setClientEmail] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Client suggestions for autofill
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<"name" | "phone" | null>(null);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [suggestions]);

  const handleClientSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[focusedSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

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
    setSelectedClient(client);
    setClientName(client.name || "");
    const fullPhone: string = client.phone || "";
    setClientPhone(fullPhone);
    // Extract just the 10 digit local part for the restricted input
    const digitsOnly = fullPhone.replace(/[^\d]/g, "");
    const localPart = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    setPhoneDigits(localPart);
    setClientEmail(client.email || "");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSearchField(null);
  };

  // Service selection
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  // Product selection
  const [bookingMode, setBookingMode] = useState<"service" | "product">("service");
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<(Product & { quantity: number })[]>([]);

  const handleUpdateQty = (prodId: string, delta: number) => {
    setSelectedProducts(prev => {
      const next = prev.map(p => {
        if (p.id === prodId) {
          const newQty = Math.max(1, Math.min(p.stock, p.quantity + delta));
          return { ...p, quantity: newQty };
        }
        return p;
      });
      const sumPrice = next.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);
      setSalePrice(String(sumPrice));
      setDiscountPct("0");
      return next;
    });
  };
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "ONLINE">("ONLINE");

  // Inline new-service form
  const [showNewService, setShowNewService] = useState(false);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcCategory, setNewSvcCategory] = useState("");
  const [selectedCategoryOption, setSelectedCategoryOption] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [creatingService, setCreatingService] = useState(false);

  // Schedule
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [date, setDate] = useState(defaultDate ?? getLocalDateStr());
  const [time, setTime] = useState(""); // Default to empty string for "Auto-calculate"
  const [endTime, setEndTime] = useState(() => getCurrentTimeHHMM());
  const [currentTime, setCurrentTime] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("");
  const [isStatusManuallyChanged, setIsStatusManuallyChanged] = useState(false);

  // ── Segmented Time Input (HH : MM  AM/PM) ────────────────────────────────
  const [timeHH, setTimeHH] = useState(""); // "01"–"12"
  const [timeMM, setTimeMM] = useState(""); // "00"–"59"
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("AM");
  const hhRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);

  // Sync display states when endTime (24h internal) changes
  const syncTimeDisplay = (t24: string) => {
    if (!t24) { setTimeHH(""); setTimeMM(""); setTimeAmPm("AM"); return; }
    const parts = format24to12(t24).split(" "); // e.g. ["02:30", "PM"]
    const [h, m] = parts[0].split(":");
    setTimeHH(h);
    setTimeMM(m);
    setTimeAmPm(parts[1] as "AM" | "PM");
  };

  // HH segment change — digits only, auto-jump to MM at 2 chars, 24h conversion
  const handleHHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (raw.length === 2) {
      let n = parseInt(raw, 10);
      // 24h → 12h conversion
      if (n === 0) { setTimeHH("12"); setTimeAmPm("AM"); }
      else if (n === 12) { setTimeHH("12"); setTimeAmPm("PM"); }
      else if (n >= 13 && n <= 23) { setTimeHH(String(n - 12).padStart(2, "0")); setTimeAmPm("PM"); }
      else if (n >= 1 && n <= 9) { setTimeHH(String(n).padStart(2, "0")); }
      else { setTimeHH(raw); }
      // Auto-jump to MM
      setTimeout(() => { mmRef.current?.focus(); mmRef.current?.select(); }, 0);
    } else {
      setTimeHH(raw);
    }
  };

  // MM segment change — digits only, max 59
  const handleMMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (raw.length === 2 && parseInt(raw, 10) > 59) {
      setTimeMM("59");
    } else {
      setTimeMM(raw);
    }
  };

  // Backspace on MM when empty → go back to HH; ArrowLeft at start → go to HH
  const handleMMKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && timeMM === "") {
      e.preventDefault();
      hhRef.current?.focus();
      setTimeout(() => {
        if (hhRef.current) {
          hhRef.current.selectionStart = hhRef.current.selectionEnd = hhRef.current.value.length;
        }
      }, 0);
    }
    if (e.key === "ArrowLeft" && (e.currentTarget.selectionStart ?? 0) === 0) {
      e.preventDefault();
      hhRef.current?.focus();
      setTimeout(() => {
        if (hhRef.current) hhRef.current.selectionStart = hhRef.current.selectionEnd = hhRef.current.value.length;
      }, 0);
    }
    if (e.key === "Enter") e.currentTarget.blur();
  };

  // Commit time to endTime state on blur from either segment
  const commitTime = () => {
    const hh = timeHH || "12";
    const mm = timeMM.padStart(2, "0") || "00";
    const combined = hh + ":" + mm + " " + timeAmPm;
    const parsed = format12to24(combined);
    if (parsed) {
      setEndTime(parsed);
      syncTimeDisplay(parsed);
    } else if (!timeHH) {
      setEndTime("");
    } else {
      // Revert
      if (endTime) syncTimeDisplay(endTime);
      else { setTimeHH(""); setTimeMM(""); }
    }
  };

  // HH keydown: Enter blurs; ArrowRight at end → jump to MM
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "ArrowRight" && (e.currentTarget.selectionEnd ?? 0) === e.currentTarget.value.length) {
      e.preventDefault();
      mmRef.current?.focus();
      setTimeout(() => { if (mmRef.current) mmRef.current.selectionStart = mmRef.current.selectionEnd = 0; }, 0);
    }
  };


  // Pricing
  const [salePrice, setSalePrice] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [taxPct, setTaxPct] = useState(0); // 0 = None

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Conflict resolution
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictingClient, setConflictingClient] = useState<any | null>(null);
  const [allowConflictOverride, setAllowConflictOverride] = useState(false);

  // Booking confirmation / receipt print state
  const [createdBooking, setCreatedBooking] = useState<{
    clientName: string;
    clientPhone: string;
    services: Service[];
    products?: (Product & { quantity: number })[];
    staffName: string;
    date: string;
    time: string;
    endTime: string;
    salePrice: number;
    discountPct: number;
    taxPct: number;
    taxAmt: number;
    finalPrice: number;
    paymentMethod?: string;
  } | null>(null);

  // ── Load data when modal opens ─────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const cur = getCurrentTimeHHMM();
    setCurrentTime(cur);
    // Reset tab
    setActiveTab("client");

    // Load services (filter out internal "Product Sale" dummy service)
    setServicesLoading(true);
    fetch("/api/services?limit=200")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setServices(d.data.filter((s: Service) => !(s.name === "Product Sale" && s.category === "Retail")));
        }
      })
      .catch(() => { })
      .finally(() => setServicesLoading(false));

    // Load staff
    setStaffLoading(true);
    fetch("/api/staff?limit=100")
      .then(r => r.json())
      .then(d => { if (d.data) setStaffList(d.data); })
      .catch(() => { })
      .finally(() => setStaffLoading(false));
  }, [open]);

  // Load products when mode is product and list is empty
  useEffect(() => {
    if (open && bookingMode === "product" && productsList.length === 0) {
      setProductsLoading(true);
      fetch("/api/products?limit=1000")
        .then(r => r.json())
        .then(d => { if (d.data) setProductsList(d.data); })
        .catch(() => { })
        .finally(() => setProductsLoading(false));
    }
  }, [open, bookingMode, productsList]);

  // Reset selections when bookingMode toggles
  useEffect(() => {
    setSelectedServices([]);
    setSelectedProducts([]);
    setSalePrice("");
    setDiscountPct("0");
    setProductSearch("");
    setServiceSearch("");
  }, [bookingMode]);

  useEffect(() => {
    if (!open) return;
    if (editingGroup) {
      setSelectedClient(editingGroup.client || null);
      setClientName(editingGroup.client?.name || "");
      const editPhone: string = editingGroup.client?.phone || "";
      setClientPhone(editPhone);
      const editDigits = editPhone.replace(/[^\d]/g, "");
      setPhoneDigits(editDigits.length >= 10 ? editDigits.slice(-10) : editDigits);
      setClientEmail(editingGroup.client?.email || "");
      setDate(editingGroup.date);
      setTime(editingGroup.startTime || "");
      setEndTime(editingGroup.endTime || "");
      setNotes(editingGroup.notes || "");
      setStatus(editingGroup.status || "");
      setIsStatusManuallyChanged(!!editingGroup.status);
      setBookingMode("service");
      setPaymentMethod(editingGroup.appointments?.[0]?.transaction?.paymentMethod || "ONLINE");
    } else {
      setSelectedClient(null);
      setClientName(""); setClientPhone(""); setPhoneDigits(""); setClientEmail("");
      setSelectedServices([]);
      setSelectedProducts([]);
      setBookingMode("service");
      setPaymentMethod("ONLINE");
      setSelectedStaff(null);
      setDate(defaultDate ?? getLocalDateStr());
      setTime("");
      setEndTime(currentTime || getCurrentTimeHHMM());
      setNotes("");
      setSalePrice(""); setDiscountPct("0");
      setStatus("");
      setIsStatusManuallyChanged(false);
    }
  }, [open, editingGroup, defaultDate, currentTime]);

  // Helper to get auto-detected status based on selected date & time
  const autoStatus = useMemo(() => {
    let overallEndTime = endTime || time || "";

    const todayStr = getLocalDateStr();

    // 1. If date is in the past, default to COMPLETED
    if (date < todayStr) {
      return "COMPLETED";
    }

    // 2. If date is in the future, default to PENDING
    if (date > todayStr) {
      return "PENDING";
    }

    // 3. If date is today, check timestamp
    if (date === todayStr && overallEndTime) {
      try {
        const appointmentEndDateTime = new Date(`${date}T${overallEndTime}:00+05:30`);
        if (Date.now() > appointmentEndDateTime.getTime()) {
          return "COMPLETED";
        }
      } catch (e) {
        // ignore
      }
    }
    return "PENDING";
  }, [date, time, endTime]);

  useEffect(() => {
    if (!isStatusManuallyChanged && status !== autoStatus) {
      setStatus(autoStatus);
    }
  }, [autoStatus, isStatusManuallyChanged, status]);

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
    syncTimeDisplay(endTime);
  }, [endTime]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const cat = s.category || "General";
      acc[cat] = acc[cat] ?? [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [services, serviceSearch]);

  const groupedProducts = useMemo(() => {
    const filtered = productsList.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category && p.category.some(cat => cat.toLowerCase().includes(productSearch.toLowerCase())))
    );
    return filtered.reduce<Record<string, Product[]>>((acc, p) => {
      const cat = p.category && p.category.length > 0 ? p.category[0] : "Uncategorized";
      acc[cat] = acc[cat] ?? [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [productsList, productSearch]);

  const modalTabs = useMemo(() => [
    { id: "client" as Tab, label: "Client", icon: User },
    { id: "service" as Tab, label: bookingMode === "product" ? "Product" : "Service", icon: bookingMode === "product" ? Package : Scissors },
    { id: "schedule" as Tab, label: "Schedule", icon: CalendarDays },
    { id: "pricing" as Tab, label: "Pricing", icon: Tag },
  ], [bookingMode]);

  const validateTab = (tabId: Tab, showToast = true): boolean => {
    if (tabId === "client") {
      if (!clientName.trim()) {
        if (showToast) error("Client name is required.");
        return false;
      }
      if (phoneDigits.length !== 10) {
        if (showToast) error("Phone number is required and must be exactly 10 digits.");
        return false;
      }
      return true;
    }
    if (tabId === "service") {
      if (bookingMode === "service") {
        if (selectedServices.length === 0) {
          if (showToast) error("Please select at least one service.");
          return false;
        }
      } else {
        if (selectedProducts.length === 0) {
          if (showToast) error("Please select at least one product.");
          return false;
        }
      }
      return true;
    }
    if (tabId === "schedule") {
      if (!selectedStaff) {
        if (showToast) error("Please select a staff member.");
        return false;
      }
      if (!date) {
        if (showToast) error("Please choose a date.");
        return false;
      }
      let finalTime = time;
      let finalEndTime = endTime;
      if (timeHH) {
        const combined = (timeHH || "12") + ":" + (timeMM || "00").padStart(2, "0") + " " + timeAmPm;
        const parsed = format12to24(combined);
        if (parsed) finalEndTime = parsed;
      }
      if (!finalEndTime && !finalTime) {
        if (showToast) error("Time is required.");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleTabChange = (targetTab: Tab) => {
    const targetIdx = modalTabs.findIndex(t => t.id === targetTab);
    const activeIdx = modalTabs.findIndex(t => t.id === activeTab);
    if (targetIdx > activeIdx) {
      for (let i = activeIdx; i < targetIdx; i++) {
        if (!validateTab(modalTabs[i].id)) {
          setActiveTab(modalTabs[i].id);
          return;
        }
      }
    }
    setActiveTab(targetTab);
  };

  const existingCategories = useMemo(() => {
    const cats = services.map(s => s.category);
    return Array.from(new Set(cats)).filter(Boolean).sort();
  }, [services]);

  const salePriceNum = parseFloat(salePrice) || 0;
  const discountNum = parseFloat(discountPct) || 0;
  const discountAmt = discountType === "PERCENTAGE"
    ? Math.round(salePriceNum * discountNum / 100)
    : Math.round(discountNum);

  const priceAfterDiscount = Math.max(0, salePriceNum - discountAmt);
  const taxAmt = Math.round(priceAfterDiscount * taxPct / 100);
  const finalPrice = priceAfterDiscount + taxAmt;

  const totalCostPrice = useMemo(() => {
    if (bookingMode !== "product") return 0;
    return selectedProducts.reduce((sum, p) => {
      const itemCost = p.costPrice !== undefined ? Number(p.costPrice) : 0;
      return sum + itemCost * p.quantity;
    }, 0);
  }, [selectedProducts, bookingMode]);

  // Calculate equivalent percentage to send to API
  const effectiveDiscountPct = discountType === "PERCENTAGE"
    ? discountNum
    : (salePriceNum > 0 ? (discountNum / salePriceNum) * 100 : 0);

  const displayTimeSummary = (timeHH && timeMM)
    ? `${timeHH}:${timeMM} ${timeAmPm.toLowerCase()}`
    : endTime
      ? format24to12(endTime).toLowerCase()
      : "";

  const displayTimeConfirm = createdBooking?.endTime
    ? format24to12(createdBooking.endTime).toLowerCase()
    : createdBooking?.time
      ? createdBooking.time.toLowerCase()
      : "";

  // ── Inline service creation ────────────────────────────────────────────────

  const handleCreateService = async () => {
    if (!newSvcName || !newSvcCategory || newSvcPrice === "") {
      error("Please fill in service name, category, and price.");
      return;
    }
    const parsedPrice = parseFloat(newSvcPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      error("Price cannot be negative.");
      return;
    }
    if (selectedCategoryOption === "__new__") {
      const duplicate = existingCategories.find(
        c => c.toLowerCase() === newSvcCategory.trim().toLowerCase()
      );
      if (duplicate) {
        error(`Category "${duplicate}" already exists. Please select it from the dropdown.`);
        return;
      }
    }
    setCreatingService(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSvcName,
          category: newSvcCategory,
          price: parseFloat(newSvcPrice),
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
      setNewSvcName(""); setNewSvcCategory(""); setSelectedCategoryOption(""); setNewSvcPrice("");
      success(`"${newSvc.name}" created & selected!`);
    } catch (e: any) {
      error(e.message ?? "Error creating service");
    } finally {
      setCreatingService(false);
    }
  };

  // ── Form submission ────────────────────────────────────────────────────────

  const handlePrintReceipt = async (bookingDetails: typeof createdBooking) => {
    if (!bookingDetails) return;

    let salonName = "Madoe's Salon";
    let salonAddress = "CE/1/B/122 NEWTOWN KOLKATA-157";
    let salonPhone = "+919836867607(M)";
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.salon_name) salonName = data.data.salon_name;
        if (data.data.address) salonAddress = data.data.address;
        if (data.data.phone) salonPhone = data.data.phone;
      }
    } catch (e) {
      console.error("Error fetching salon settings for print:", e);
    }

    const width = 450;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const printWindow = window.open("", "_blank", `width=${width},height=${height},left=${left},top=${top}`);
    if (!printWindow) {
      error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const isProductSale = bookingDetails.products && bookingDetails.products.length > 0;
    const timeStr = bookingDetails.endTime ? format24to12(bookingDetails.endTime).toLowerCase().replace(/\s+/g, "") : "";

    const paymentFormatted = (bookingDetails.paymentMethod === "ONLINE" ? "ONLINE" :
      bookingDetails.paymentMethod === "UPI" ? "ONLINE (UPI)" :
        bookingDetails.paymentMethod === "CARD" ? "ONLINE (CARD)" :
          bookingDetails.paymentMethod === "BANK_TRANSFER" ? "BANK TRANSFER" : "CASH").toUpperCase();

    const taxAmt = bookingDetails.taxAmt !== undefined ? bookingDetails.taxAmt : (bookingDetails.taxPct > 0 ? Math.round((bookingDetails.salePrice - (bookingDetails.salePrice * bookingDetails.discountPct / 100)) * bookingDetails.taxPct / 100) : 0);

    const servicesHtml = isProductSale
      ? bookingDetails.products!.map(p => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${p.name.toUpperCase()} (X${p.quantity})</span>
            <span>₹${(Number(p.price) * p.quantity).toFixed(2)}</span>
          </div>
        `).join("")
      : bookingDetails.services.map(s => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${s.name.toUpperCase()}</span>
            <span>₹${Number(s.price).toFixed(2)}</span>
          </div>
        `).join("");

    const discountHtml = bookingDetails.discountPct > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>DISCOUNT (${bookingDetails.discountPct}%)</span>
        <span>-₹${(bookingDetails.salePrice * bookingDetails.discountPct / 100).toFixed(2)}</span>
      </div>
    ` : "";

    const taxHtml = taxAmt > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>GST (${bookingDetails.taxPct}%)</span>
        <span>₹${Number(taxAmt).toFixed(2)}</span>
      </div>
    ` : "";

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
            .section-title, .section-title * {
              font-size: 14px !important;
              font-weight: 900 !important;
            }
            .services-list, .services-list * {
              font-size: 13px !important;
            }
            .center {
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .double-divider {
              border-top: 3px double #000;
              margin: 8px 0;
            }
            .footer {
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="center header-title">${salonName.toUpperCase()}</div>
          <div class="center">${salonAddress.toUpperCase()}</div>
          <div class="center" style="margin-bottom: 5px;">${salonPhone.toUpperCase()}</div>
          <div class="divider"></div>
          
          <div>DATE: ${bookingDetails.date}</div>
          <div>TIME: ${timeStr.toUpperCase()}</div>
          <div>CUSTOMER: ${bookingDetails.clientName.toUpperCase()}</div>
          ${bookingDetails.clientPhone ? `<div>PHONE: ${bookingDetails.clientPhone}</div>` : ""}
          <div>STAFF: ${bookingDetails.staffName.toUpperCase()}</div>
          <div>PAYMENT: ${paymentFormatted}</div>
          
          <div class="divider"></div>
          <div class="section-title" style="margin-bottom: 5px;">${isProductSale ? "PRODUCTS" : "SERVICES"}</div>
          <div class="services-list">
            ${servicesHtml}
          </div>
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>SUBTOTAL</span>
            <span>₹${bookingDetails.salePrice.toFixed(2)}</span>
          </div>
          ${discountHtml}
          ${taxHtml}
          
          <div class="double-divider"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 3px; font-weight: 900;">
            <span>TOTAL (INR)</span>
            <span>₹${bookingDetails.finalPrice.toFixed(2)}</span>
          </div>
          <div class="double-divider"></div>
          
          <div class="center footer">
            THANK YOU FOR VISITING!
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

  const handleSubmit = async (overrideConflict: boolean | any = false) => {
    const isFutureDate = date > getLocalDateStr();
    if (!clientName.trim()) { error("Client name is required."); setActiveTab("client"); return; }
    if (phoneDigits.length !== 10) {
      error("Phone number is required and must be exactly 10 digits.");
      setActiveTab("client");
      return;
    }
    if (bookingMode === "service" && selectedServices.length === 0) {
      error("Please select at least one service.");
      setActiveTab("service");
      return;
    }
    if (bookingMode === "product" && selectedProducts.length === 0) {
      error("Please select at least one product.");
      setActiveTab("service");
      return;
    }
    if (!selectedStaff) { error("Please select a staff member."); setActiveTab("schedule"); return; }
    if (!date) { error("Please choose a date."); setActiveTab("schedule"); return; }

    let finalTime = time;
    let finalEndTime = endTime;
    // Commit any in-progress typed time
    if (timeHH) {
      const combined = (timeHH || "12") + ":" + (timeMM || "00").padStart(2, "0") + " " + timeAmPm;
      const parsed = format12to24(combined);
      if (parsed) finalEndTime = parsed;
    }
    if (!finalEndTime && !finalTime) {
      error("Time is required.");
      setActiveTab("schedule");
      return;
    }
    if (finalPrice <= 0) { error("Sale price must be greater than 0."); setActiveTab("pricing"); return; }
    if (bookingMode === "product" && finalPrice < totalCostPrice) {
      error(`Final price (₹${finalPrice.toLocaleString("en-IN")}) cannot be less than the total buying cost (₹${totalCostPrice.toLocaleString("en-IN")}) to prevent selling at a loss.`);
      setActiveTab("pricing");
      return;
    }

    let formattedPhone = "";
    if (clientPhone.trim()) {
      const { isValid, formatted } = validateAndFormatPhone(clientPhone);
      if (!isValid) {
        error("Phone number must be strictly 10 digits prefixed with a country code (by default +91 for India).");
        setActiveTab("client");
        return;
      }
      formattedPhone = formatted;
    }

    // Check for existing client conflicts
    try {
      let existingByEmail: any = null;
      let existingByPhone: any = null;

      if (clientEmail.trim()) {
        const searchRes = await fetch(`/api/clients?search=${encodeURIComponent(clientEmail.trim())}&limit=10`);
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          existingByEmail = searchData.data.find(
            (c: any) => c.email?.toLowerCase() === clientEmail.trim().toLowerCase()
          );
        }
      }

      if (formattedPhone) {
        const cleanDigits = formattedPhone.replace(/[^\d]/g, "");
        const searchPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

        const searchRes = await fetch(`/api/clients?search=${encodeURIComponent(searchPhone)}&limit=10`);
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          existingByPhone = searchData.data.find((c: any) => {
            const cleanInputPhone = formattedPhone.replace(/[\s+-]/g, "");
            const cleanDbPhone = c.phone?.trim().replace(/[\s+-]/g, "") || "";
            return cleanInputPhone && (cleanDbPhone === cleanInputPhone || cleanDbPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanDbPhone));
          });
        }
      }

      const conflictClient = existingByEmail || existingByPhone;
      const shouldOverride = overrideConflict === true || allowConflictOverride;

      if (conflictClient && !shouldOverride) {
        const originalClientId = editingGroup?.client?.id || selectedClient?.id;

        if (originalClientId && conflictClient.id !== originalClientId) {
          error(`The phone number or email conflicts with an existing client: "${conflictClient.name}".`);
          setActiveTab("client");
          return;
        }

        const nameChanged = clientName.trim().toLowerCase() !== conflictClient.name.trim().toLowerCase();
        if (nameChanged) {
          setConflictingClient(conflictClient);
          setShowConflictWarning(true);
          return;
        }
      }
    } catch (err) {
      console.error("Conflict validation check failed:", err);
    }

    setSubmitting(true);
    try {
      // 1. Resolve client ID and update, or create a new client
      let clientId: string | null = null;

      if (editingGroup?.client?.id) {
        clientId = editingGroup.client.id;
      } else {
        let foundClient: any = null;

        // 1. Try resolving by email
        if (clientEmail.trim()) {
          const searchRes = await fetch(`/api/clients?search=${encodeURIComponent(clientEmail.trim())}&limit=10`);
          const searchData = await searchRes.json();
          if (searchData.data?.length > 0) {
            foundClient = searchData.data.find((c: any) => c.email?.toLowerCase() === clientEmail.trim().toLowerCase());
          }
        }

        // 2. Try resolving by phone (using last 10 digits to bypass country code spaces or mismatch)
        if (!foundClient && formattedPhone) {
          const cleanDigits = formattedPhone.replace(/[^\d]/g, "");
          const searchPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

          const searchRes = await fetch(`/api/clients?search=${encodeURIComponent(searchPhone)}&limit=10`);
          const searchData = await searchRes.json();
          if (searchData.data?.length > 0) {
            foundClient = searchData.data.find((c: any) => {
              const cleanInputPhone = formattedPhone.replace(/[\s+-]/g, "");
              const cleanDbPhone = c.phone?.trim().replace(/[\s+-]/g, "") || "";
              return cleanInputPhone && (cleanDbPhone === cleanInputPhone || cleanDbPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanDbPhone));
            });
          }
        }

        if (foundClient) {
          clientId = foundClient.id;
        }
      }

      if (clientId) {
        // Update existing client details
        const updateBody: any = {
          name: clientName.trim(),
        };

        // Update phone (allows clearing phone as well)
        updateBody.phone = formattedPhone || "";

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
            name: clientName.trim(),
            phone: formattedPhone || undefined,
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
          serviceIds: bookingMode === "service" ? selectedServices.map(s => s.id) : undefined,
          productIds: bookingMode === "product"
            ? selectedProducts.flatMap(p => Array(p.quantity).fill(p.id))
            : undefined,
          staffId: selectedStaff.id,
          date,
          startTime: isFutureDate ? finalEndTime : (finalTime || undefined),
          endTime: isFutureDate ? undefined : finalEndTime,
          price: finalPrice,
          notes: notes.trim() || undefined,
          status: bookingMode === "product" ? "COMPLETED" : (status || undefined),
          taxPct,
          discountPct: effectiveDiscountPct,
          paymentMethod,
          ...(editingGroup && { deleteAppointmentIds: editingGroup.appointments.map((a: any) => a.id) }),
        }),
      });
      const apptData = await apptRes.json();
      if (!apptRes.ok) throw new Error(apptData.error ?? (editingGroup ? "Could not update booking" : "Could not create booking"));

      success(editingGroup ? "Booking updated successfully!" : bookingMode === "product" ? "Product sale completed!" : "Booking created successfully!");
      window.dispatchEvent(new CustomEvent("booking-created"));
      onCreated?.();

      setCreatedBooking({
        clientName: clientName.trim(),
        clientPhone: formattedPhone,
        services: selectedServices,
        products: selectedProducts,
        staffName: selectedStaff.name,
        date,
        time: finalTime || apptData.data.startTime,
        endTime: isFutureDate ? apptData.data.endTime : finalEndTime,
        salePrice: salePriceNum,
        discountPct: effectiveDiscountPct,
        taxPct,
        taxAmt,
        finalPrice,
        paymentMethod,
      });
    } catch (e: any) {
      error(e.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
      setAllowConflictOverride(false);
    }
  };

  // ── Reset & Close ──────────────────────────────────────────────────────────

  const handleClose = () => {
    setSelectedClient(null);
    setClientName(""); setClientPhone(""); setPhoneDigits(""); setClientEmail("");
    setSelectedServices([]); setServiceSearch("");
    setSelectedProducts([]); setProductSearch("");
    setBookingMode("service");
    setPaymentMethod("UPI");
    setShowNewService(false);
    setSelectedStaff(null);
    setDate(defaultDate ?? getLocalDateStr());
    setTime("");
    setEndTime(getCurrentTimeHHMM());
    setNotes("");
    setSalePrice(""); setDiscountPct("0");
    setStatus("");
    setIsStatusManuallyChanged(false);
    setActiveTab("client");
    setCreatedBooking(null);
    setShowConflictWarning(false);
    setConflictingClient(null);
    setAllowConflictOverride(false);
    onClose();
  };

  // ── Progress indicator ─────────────────────────────────────────────────────

  const isFutureDate = date > getLocalDateStr();
  const tabComplete: Record<Tab, boolean> = {
    client: !!clientName.trim() && phoneDigits.length === 10,
    service: bookingMode === "product" ? selectedProducts.length > 0 : selectedServices.length > 0,
    schedule: !!selectedStaff && !!date && (isFutureDate ? !!time : !!endTime),
    pricing: finalPrice > 0,
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* Conflict Warning Dialog */}
      {showConflictWarning && conflictingClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setShowConflictWarning(false);
              setConflictingClient(null);
              setAllowConflictOverride(false);
            }}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl overflow-hidden p-6"
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
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 border border-orange-500/25">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  Existing Client Detected
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  This phone number is registered to <strong>"{conflictingClient.name}"</strong>.
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(249, 115, 22, 0.05)", border: "1px solid rgba(249, 115, 22, 0.1)" }}>
              <p style={{ color: "var(--text-primary)" }} className="text-sm">
                You're trying to {editingGroup ? "update" : "create"} a booking under <strong>"{clientName}"</strong>. Do you want to update the existing client's name to match?
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConflictWarning(false);
                  setConflictingClient(null);
                  setAllowConflictOverride(false);
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConflictWarning(false);
                  setAllowConflictOverride(true);
                  // Schedule re-submission after state update
                  setTimeout(() => handleSubmit(true), 0);
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                style={{
                  background: "#dc2626", // Red,
                  color: "white",
                }}
              >
                Update & Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                {editingGroup
                  ? "Booking Updated!"
                  : createdBooking.products && createdBooking.products.length > 0
                    ? "Sale Completed!"
                    : status === "COMPLETED"
                      ? "Booking Completed!"
                      : "Booking Scheduled!"}
              </h3>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                {editingGroup
                  ? "The appointment has been updated successfully."
                  : createdBooking.products && createdBooking.products.length > 0
                    ? "The product sale has been recorded successfully."
                    : status === "COMPLETED"
                      ? "The appointment has been completed and recorded successfully."
                      : "The appointment has been scheduled successfully."}
              </p>

              <div className="rounded-xl p-4 mb-6 text-left space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Customer:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{createdBooking.clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Staff:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{createdBooking.staffName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Date:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{createdBooking.date}</span>
                </div>
                {displayTimeConfirm && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Time:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayTimeConfirm}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Payment Method:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {createdBooking.paymentMethod === "ONLINE" ? "Online" :
                      createdBooking.paymentMethod === "UPI" ? "Online (UPI)" :
                        createdBooking.paymentMethod === "CARD" ? "Online (Card)" :
                          createdBooking.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "Cash"}
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

              {/* ── Mode Toggle Segmented Control ── */}
              {!editingGroup && (
                <div className="px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex p-1 rounded-xl bg-black/[0.15] dark:bg-white/[0.05] border border-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setBookingMode("service")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        background: bookingMode === "service" ? "var(--bg-secondary)" : "transparent",
                        color: bookingMode === "service" ? "#f43f5e" : "var(--text-muted)",
                        boxShadow: bookingMode === "service" ? "0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px var(--border-subtle)" : "none",
                      }}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      Service Appointment
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingMode("product")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        background: bookingMode === "product" ? "var(--bg-secondary)" : "transparent",
                        color: bookingMode === "product" ? "#f43f5e" : "var(--text-muted)",
                        boxShadow: bookingMode === "product" ? "0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px var(--border-subtle)" : "none",
                      }}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Product Sale
                    </button>
                  </div>
                </div>
              )}

              {/* ── Tab Navigation ── */}
              <div
                className="flex gap-0 px-6 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {modalTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isDone = tabComplete[tab.id];
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
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
                            onKeyDown={handleClientSearchKeyDown}
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
                                background: "var(--bg-dropdown)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              {suggestions.map((client, index) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(client);
                                  }}
                                  onClick={() => handleSelectSuggestion(client)}
                                  className={`w-full text-left px-4 py-2 transition-colors flex flex-col py-2 ${index === focusedSuggestionIndex
                                    ? "bg-black/[0.05] dark:bg-white/[0.08]"
                                    : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                    }`}
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
                          Phone Number <span className="text-rose-500">*</span>{" "}
                          <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>(10 digits, required)</span>
                        </label>
                        {/* Split input: fixed +91 badge + 10-digit only field */}
                        <div className="relative flex items-stretch rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)", background: "var(--bg-card)" }}>
                          {/* Country code badge */}
                          <div
                            className="flex items-center gap-1 px-3 flex-shrink-0 text-xs font-bold select-none"
                            style={{
                              background: "rgba(244,63,94,0.07)",
                              borderRight: "1px solid var(--border-subtle)",
                              color: "#f43f5e",
                              minWidth: "54px",
                              justifyContent: "center",
                            }}
                          >
                            +91
                          </div>
                          {/* Digit-only input */}
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="9876543210"
                            maxLength={10}
                            className="flex-1 bg-transparent outline-none text-sm px-3 py-2.5"
                            style={{ color: "var(--text-primary)" }}
                            value={phoneDigits}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPhoneDigits(digits);
                              const full = digits ? `+91${digits}` : "";
                              setClientPhone(full);
                              if (digits.length >= 2) {
                                fetchSuggestions(full, "phone");
                              } else {
                                setSuggestions([]);
                                setShowSuggestions(false);
                                setActiveSearchField(null);
                              }
                            }}
                            onKeyDown={handleClientSearchKeyDown}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(false);
                                setActiveSearchField(null);
                              }, 200);
                            }}
                          />
                          {/* Digit counter */}
                          <div
                            className="flex items-center pr-3 text-[10px] font-semibold flex-shrink-0"
                            style={{ color: phoneDigits.length === 10 ? "#10b981" : "var(--text-muted)" }}
                          >
                            {phoneDigits.length}/10
                          </div>

                          {showSuggestions && activeSearchField === "phone" && suggestions.length > 0 && (
                            <div
                              className="absolute z-[9995] left-0 right-0 top-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl"
                              style={{
                                background: "var(--bg-dropdown)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              {suggestions.map((client, index) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(client);
                                  }}
                                  onClick={() => handleSelectSuggestion(client)}
                                  className={`w-full text-left px-4 py-2 transition-colors flex flex-col py-2 ${index === focusedSuggestionIndex
                                    ? "bg-black/[0.05] dark:bg-white/[0.08]"
                                    : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                    }`}
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

                {/* ─── SERVICE/PRODUCT TAB ─────────────────────────── */}
                {activeTab === "service" && (
                  bookingMode === "service" ? (
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
                                  const isCombo = isComboCategory(svc.category);
                                  const comboSummary = isCombo ? getComboSummary(svc.description || "", services) : "";
                                  const accentColor = isCombo ? "#8b5cf6" : "#f43f5e";
                                  const accentBg = isCombo ? "rgba(139,92,246,0.1)" : "rgba(244,63,94,0.1)";
                                  const accentBorder = isCombo ? "rgba(139,92,246,0.35)" : "rgba(244,63,94,0.35)";
                                  return (
                                    <button
                                      type="button"
                                      key={svc.id}
                                      onClick={handleToggleService}
                                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left"
                                      style={{
                                        background: isSelected ? accentBg : "var(--bg-card)",
                                        border: `1px solid ${isSelected ? accentBorder : "var(--border-subtle)"}`,
                                      }}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                          style={{ background: isSelected ? (isCombo ? "rgba(139,92,246,0.15)" : "rgba(244,63,94,0.15)") : "rgba(255,255,255,0.04)" }}
                                        >
                                          {isCombo
                                            ? <Package className="w-3.5 h-3.5" style={{ color: isSelected ? accentColor : "var(--text-muted)" }} />
                                            : <Scissors className="w-3.5 h-3.5" style={{ color: isSelected ? accentColor : "var(--text-muted)" }} />
                                          }
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold" style={{ color: isSelected ? accentColor : "var(--text-primary)" }}>
                                            {svc.name}
                                          </p>
                                          {comboSummary && (
                                            <p className="text-xs mt-0.5" style={{ color: isSelected ? accentColor : "var(--text-muted)", opacity: 0.85 }}>
                                              Includes: {comboSummary}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-bold" style={{ color: isSelected ? accentColor : "var(--text-primary)" }}>
                                          ₹{Number(svc.price).toLocaleString("en-IN")}
                                        </p>
                                        {isSelected && <Check className="w-3.5 h-3.5 ml-auto mt-0.5" style={{ color: accentColor }} />}
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
                                  <select
                                    className="input-field text-xs py-2"
                                    value={selectedCategoryOption}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setSelectedCategoryOption(val);
                                      if (val !== "__new__") {
                                        setNewSvcCategory(val);
                                      } else {
                                        setNewSvcCategory("");
                                      }
                                    }}
                                  >
                                    <option value="" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Select a category</option>
                                    {existingCategories.map(cat => (
                                      <option key={cat} value={cat} style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>{cat}</option>
                                    ))}
                                    <option value="__new__" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>+ Add New Category...</option>
                                  </select>
                                </div>

                                {selectedCategoryOption === "__new__" && (
                                  <div className="space-y-1 col-span-1 sm:col-span-2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>New Category Name *</label>
                                    <input
                                      type="text"
                                      placeholder="Enter new category name"
                                      className="input-field text-xs py-2"
                                      value={newSvcCategory}
                                      onChange={e => setNewSvcCategory(e.target.value)}
                                    />
                                  </div>
                                )}
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Price (₹) *</label>
                                  <input type="number" min="0" placeholder="0.00" className="input-field text-xs py-2"
                                    value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} />
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
                  ) : (
                    <div className="space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                        <input
                          type="text"
                          placeholder="Search product name or category…"
                          className="input-field pl-9"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                        />
                      </div>

                      {/* Product list grouped by category */}
                      {productsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {Object.entries(groupedProducts).length === 0 && (
                            <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>No products found</p>
                          )}
                          {Object.entries(groupedProducts).map(([cat, prods]) => (
                            <div key={cat}>
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                                {cat}
                              </p>
                              <div className="space-y-1">
                                {prods.map(prod => {
                                  const isSelected = selectedProducts.some(p => p.id === prod.id);
                                  const handleToggleProduct = () => {
                                    if (prod.stock <= 0 && !isSelected) return;
                                    let nextProducts;
                                    if (isSelected) {
                                      nextProducts = selectedProducts.filter(p => p.id !== prod.id);
                                    } else {
                                      nextProducts = [...selectedProducts, { ...prod, quantity: 1 }];
                                    }
                                    setSelectedProducts(nextProducts);
                                    const sumPrice = nextProducts.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);
                                    setSalePrice(String(sumPrice));
                                    setDiscountPct("0");
                                  };
                                  return (
                                    <button
                                      type="button"
                                      key={prod.id}
                                      onClick={handleToggleProduct}
                                      disabled={prod.stock <= 0 && !isSelected}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${prod.stock <= 0 && !isSelected ? "opacity-40 cursor-not-allowed" : ""
                                        }`}
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
                                          <Package className="w-3.5 h-3.5" style={{ color: isSelected ? "#f43f5e" : "var(--text-muted)" }} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold" style={{ color: isSelected ? "#f43f5e" : "var(--text-primary)" }}>
                                            {prod.name}
                                          </p>
                                          <p className="text-[10px]" style={{ color: prod.stock <= 0 ? "#ef4444" : "var(--text-muted)" }}>
                                            Stock: {prod.stock} left
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end justify-center">
                                        <p className="text-xs font-bold" style={{ color: isSelected ? "#f43f5e" : "var(--text-primary)" }}>
                                          ₹{Number(prod.price).toLocaleString("en-IN")}
                                        </p>
                                        {isSelected ? (
                                          <div className="mt-1" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/5 rounded-lg p-0.5 border border-default">
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateQty(prod.id, -1)}
                                                className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold hover:bg-black/10 dark:hover:bg-white/10"
                                                style={{ color: "var(--text-secondary)" }}
                                              >
                                                -
                                              </button>
                                              <span className="text-[10px] font-bold tabular-nums px-0.5" style={{ color: "var(--text-primary)" }}>
                                                {selectedProducts.find(p => p.id === prod.id)?.quantity || 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateQty(prod.id, 1)}
                                                disabled={(selectedProducts.find(p => p.id === prod.id)?.quantity || 1) >= prod.stock}
                                                className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                                style={{ color: "var(--text-secondary)" }}
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
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
                            const colors = ["#f43f5e", "#a855f7", "#06b6d4", "#f59e0b", "#10b981", "#f97316"];
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

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Appointment Date <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="date"
                            className="input-field pl-9"
                            style={{ height: "42px" }}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Segmented Time Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Time <span className="text-rose-500">*</span>
                        </label>
                        {/* Outer wrapper styled like input-field but flex */}
                        <div
                          className="input-field flex items-center"
                          style={{ height: "42px", paddingLeft: "0.625rem", paddingRight: "0.5rem", gap: 0 }}
                        >
                          <Clock className="w-4 h-4 flex-shrink-0 mr-2" style={{ color: "var(--text-muted)" }} />

                          {/* HH segment */}
                          <input
                            ref={hhRef}
                            type="text"
                            inputMode="numeric"
                            placeholder="HH"
                            maxLength={2}
                            value={timeHH}
                            onChange={handleHHChange}
                            onBlur={commitTime}
                            onKeyDown={handleKeyDown}
                            className="w-7 h-full bg-transparent border-none outline-none text-center text-sm font-semibold"
                            style={{ color: "var(--text-primary)", caretColor: "#f43f5e" }}
                          />

                          {/* Fixed colon */}
                          <span className="text-sm font-semibold select-none px-0.5" style={{ color: "var(--text-muted)" }}>:</span>

                          {/* MM segment */}
                          <input
                            ref={mmRef}
                            type="text"
                            inputMode="numeric"
                            placeholder="MM"
                            maxLength={2}
                            value={timeMM}
                            onChange={handleMMChange}
                            onBlur={commitTime}
                            onKeyDown={handleMMKeyDown}
                            className="w-7 h-full bg-transparent border-none outline-none text-center text-sm font-semibold"
                            style={{ color: "var(--text-primary)", caretColor: "#f43f5e" }}
                          />

                          {/* AM/PM — subtle clickable label, only shows active period */}
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              const newPeriod = timeAmPm === "AM" ? "PM" : "AM";
                              setTimeAmPm(newPeriod);
                              const combined = (timeHH || "12") + ":" + (timeMM || "00").padStart(2, "0") + " " + newPeriod;
                              const parsed = format12to24(combined);
                              if (parsed) setEndTime(parsed);
                            }}
                            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded transition-colors select-none"
                            style={{
                              color: "var(--text-secondary)",
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {timeAmPm}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Booking Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Booking Status
                      </label>
                      <div className="relative">
                        <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                        <select
                          className="input-field pl-9 appearance-none pr-10"
                          value={status}
                          onChange={e => {
                            setStatus(e.target.value);
                            setIsStatusManuallyChanged(true);
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="NO_SHOW">No Show</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
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
                              className="input-field pl-7 opacity-80 cursor-not-allowed"
                              value={salePrice}
                              readOnly
                            />
                          </div>
                          {bookingMode === "product" && selectedProducts.length > 0 && (
                            <p className="text-sm font-bold text-emerald-500 mt-1">
                              Total buying cost: ₹{totalCostPrice.toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            Discount on Sale Price
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              {discountType === "PERCENTAGE" ? (
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                              ) : (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none" style={{ color: "var(--text-muted)" }}>₹</span>
                              )}
                              <input
                                type="number"
                                min="0"
                                max={discountType === "PERCENTAGE" ? "100" : undefined}
                                step="1"
                                placeholder="0"
                                className="input-field pl-8"
                                value={discountPct}
                                onChange={e => setDiscountPct(e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setDiscountType(discountType === "PERCENTAGE" ? "FIXED" : "PERCENTAGE")}
                              className="flex items-center px-4 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {discountType === "PERCENTAGE" ? "Percentage" : "Fixed (₹)"}
                            </button>
                          </div>
                        </div>

                        {/* Tax Rate (placed inside grid to match standard column width) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            Tax Rate
                          </label>
                          <div className="relative">
                            <select
                              className="input-field appearance-none pr-10 h-[42px]"
                              value={taxPct}
                              onChange={e => setTaxPct(Number(e.target.value))}
                            >
                              <option value={0}>None</option>
                              <option value={5}>GST @ 5%</option>
                              <option value={12}>GST @ 12%</option>
                              <option value={18}>GST @ 18%</option>
                              <option value={28}>GST @ 28%</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            Payment Method
                          </label>
                          <div className="relative">
                            <select
                              className="input-field appearance-none pr-10 h-[42px]"
                              value={paymentMethod === "CASH" ? "CASH" : "ONLINE"}
                              onChange={e => setPaymentMethod(e.target.value as any)}
                            >
                              <option value="ONLINE">Online</option>
                              <option value="CASH">Cash</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
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
                              Discount ({discountNum}{discountType === "PERCENTAGE" ? "%" : "₹"})
                            </span>
                            <span className="text-emerald-400">−₹{discountAmt.toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        {taxPct > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: "var(--text-secondary)" }}>Tax (GST {taxPct}%)</span>
                            <span className="text-amber-400">+₹{taxAmt.toLocaleString("en-IN")}</span>
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
                    {bookingMode === "product" && finalPrice < totalCostPrice && (
                      <div className="rounded-xl p-3 text-xs font-semibold flex items-center gap-2" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>Warning: Final price is less than the total buying cost (₹{totalCostPrice.toLocaleString("en-IN")})! Please reduce the discount.</span>
                      </div>
                    )}

                    {/* Booking summary card */}
                    {((bookingMode === "service" ? selectedServices.length > 0 : selectedProducts.length > 0) || selectedStaff) && (
                      <div
                        className="rounded-xl p-4 space-y-2"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          {bookingMode === "product" ? "Sale Summary" : "Booking Summary"}
                        </p>
                        {clientName && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <User className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span><strong>Customer:</strong> {clientName} {clientPhone && `· ${clientPhone}`}</span>
                          </div>
                        )}
                        {bookingMode === "service" && selectedServices.length > 0 && (
                          <div className="flex items-start gap-2 text-xs flex-col" style={{ color: "var(--text-secondary)" }}>
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3.5 h-3.5 text-rose-400" />
                              <span>Services ({selectedServices.length}):</span>
                            </div>
                            <ul className="pl-5 list-disc space-y-0.5">
                              {selectedServices.map(s => (
                                <li key={s.id}>
                                  {s.name} · ₹{Number(s.price).toLocaleString("en-IN")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {bookingMode === "product" && selectedProducts.length > 0 && (
                          <div className="flex items-start gap-2 text-xs flex-col" style={{ color: "var(--text-secondary)" }}>
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>Products ({selectedProducts.reduce((sum, p) => sum + p.quantity, 0)}):</span>
                            </div>
                            <ul className="pl-5 list-disc space-y-0.5">
                              {selectedProducts.map(p => (
                                <li key={p.id}>
                                  {p.name} (x{p.quantity}) · ₹{(Number(p.price) * p.quantity).toLocaleString("en-IN")}
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
                            <CalendarDays className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span><strong>Date:</strong> {date}</span>
                          </div>
                        )}
                        {displayTimeSummary && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span><strong>Time:</strong> {displayTimeSummary}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span><strong>Payment Method:</strong> {paymentMethod === "ONLINE" || paymentMethod === "UPI" ? "Online" : paymentMethod === "CASH" ? "Cash" : paymentMethod}</span>
                        </div>

                        {/* Pricing breakdown */}
                        {salePriceNum > 0 && (
                          <>
                            <div className="border-t border-dashed my-1" style={{ borderColor: "var(--border-subtle)" }} />
                            <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                              <span>Subtotal</span>
                              <span>₹{salePriceNum.toLocaleString("en-IN")}</span>
                            </div>
                            {discountNum > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: "var(--text-secondary)" }}>Discount ({discountNum}{discountType === "PERCENTAGE" ? "%" : "₹"})</span>
                                <span className="text-emerald-400 font-semibold">−₹{discountAmt.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            {taxPct > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: "var(--text-secondary)" }}>GST ({taxPct}%)</span>
                                <span className="text-amber-400 font-semibold">+₹{taxAmt.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm font-bold pt-1" style={{ borderTop: "1px solid rgba(244,63,94,0.2)" }}>
                              <span style={{ color: "var(--text-primary)" }}>Total</span>
                              <span className="text-rose-400">₹{finalPrice.toLocaleString("en-IN")}</span>
                            </div>
                          </>
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
                        const idx = modalTabs.findIndex(t => t.id === activeTab);
                        if (idx > 0) setActiveTab(modalTabs[idx - 1].id);
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
                        const idx = modalTabs.findIndex(t => t.id === activeTab);
                        if (idx < modalTabs.length - 1) handleTabChange(modalTabs[idx + 1].id);
                      }}
                      className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || (bookingMode === "product" && finalPrice < totalCostPrice)}
                      className={`btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 ${(bookingMode === "product" && finalPrice < totalCostPrice) ? "opacity-50 cursor-not-allowed" : ""
                        }`}
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
