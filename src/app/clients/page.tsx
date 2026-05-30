"use client";

import { Users, Plus, Search, ChevronLeft, ChevronRight, Star, Phone, Mail, X, Loader2, Calendar, ChevronDown, Edit, Trash, FileText } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { usePaginatedApi, useApi } from "@/hooks/useApi";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";

interface Client {
  id: string; name: string; email: string; phone?: string;
  tier: string; loyaltyPoints: number; totalSpent: string;
  totalVisits: number; createdAt: string;
  _count?: { appointments: number; transactions: number };
}

const TIER_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  PLATINUM: { color: "#e2e8f0", bg: "rgba(226,232,240,0.15)", icon: "💎" },
  GOLD:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "🥇" },
  SILVER:   { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "🥈" },
  BRONZE:   { color: "#b45309", bg: "rgba(180,83,9,0.12)",    icon: "🥉" },
};

const TIERS = ["All", "PLATINUM", "GOLD", "SILVER", "BRONZE"];

function ClientsPageContent() {
  const [activeTab, setActiveTab] = useState<"clients" | "staff">("clients");

  const { success: successToast, error: errorToast } = useToast();

  // Client states
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearch(s);
    }
  }, [searchParams]);

  const [tier,   setTier]   = useState("All");
  const [page,   setPage]   = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Staff states
  const [staffSearch, setStaffSearch] = useState("");
  const [staffPage,   setStaffPage]   = useState(1);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Add Client Modal states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "+91",
    dateOfBirth: "",
    address: "",
    notes: "",
  });
  const [clientSubmitting, setClientSubmitting] = useState(false);

  // Edit Client Modal states
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientEditForm, setClientEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    notes: "",
  });
  const [clientEditSubmitting, setClientEditSubmitting] = useState(false);

  // Add Staff Modal states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "+91",
    role: "STYLIST",
    salary: "",
    bio: "",
    imageUrl: "",
    serviceIds: [] as string[],
  });
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [staffFileBase64, setStaffFileBase64] = useState<string | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Edit Staff Modal states
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffEditForm, setStaffEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STYLIST",
    salary: "",
    bio: "",
    imageUrl: "",
    serviceIds: [] as string[],
  });
  const [staffEditFile, setStaffEditFile] = useState<File | null>(null);
  const [staffEditFileBase64, setStaffEditFileBase64] = useState<string | null>(null);
  const [staffEditSubmitting, setStaffEditSubmitting] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Client API call
  const clientParams = new URLSearchParams({ page: String(page), limit: "12" });
  if (tier !== "All") clientParams.set("tier", tier);
  if (search)         clientParams.set("search", search);

  const { data: clients, pagination: clientPagination, loading: clientsLoading, refetch: refetchClients } = usePaginatedApi<Client>(
    `/api/clients?${clientParams}`
  );

  // Staff API call
  const staffParams = new URLSearchParams({ page: String(staffPage), limit: "12" });
  if (staffSearch) staffParams.set("search", staffSearch);

  const { data: staffList, pagination: staffPagination, loading: staffLoading, refetch: refetchStaff } = usePaginatedApi<any>(
    `/api/staff?${staffParams}`
  );

  // Fetch active services for checklist
  const { data: servicesData } = usePaginatedApi<any>("/api/services?limit=100");
  const allServices = servicesData || [];

  // Detail queries
  const { data: clientDetail, loading: clientDetailLoading } = useApi<any>(
    selectedClientId ? `/api/clients/${selectedClientId}` : null
  );

  const { data: staffDetail, loading: staffDetailLoading } = useApi<any>(
    selectedStaffId ? `/api/staff/${selectedStaffId}` : null
  );

  // Handlers
  const handleStaffFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStaffFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setStaffFile(null);
      setStaffFileBase64(null);
    }
  };

  const handleStaffEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStaffEditFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffEditFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setStaffEditFile(null);
      setStaffEditFileBase64(null);
    }
  };

  const handleViewIdentityProof = (base64Data: string, fileName: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.title = fileName || "Identity Proof";
      const isPdf = base64Data.startsWith("data:application/pdf");
      const style = "margin:0;width:100%;height:100%;border:none;background:#1e1e2e;display:flex;align-items:center;justify-content:center;";
      if (isPdf) {
        newWindow.document.body.innerHTML = `
          <iframe src="${base64Data}" style="${style}"></iframe>
        `;
      } else {
        newWindow.document.body.innerHTML = `
          <div style="${style}">
            <img src="${base64Data}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 10px 30px rgba(0,0,0,0.5);border-radius:8px;" />
          </div>
        `;
      }
    } else {
      errorToast("Failed to open a new window. Please check your popup blocker.");
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      errorToast("Name is required");
      return;
    }
    if (!clientForm.phone.trim() || clientForm.phone.trim() === "+91") {
      errorToast("Phone number is required");
      return;
    }
    setClientSubmitting(true);
    try {
      const payload: any = {
        name: clientForm.name.trim(),
        email: clientForm.email.trim() || undefined,
        phone: clientForm.phone.trim(),
        address: clientForm.address.trim() || undefined,
        notes: clientForm.notes.trim() || undefined,
      };
      if (clientForm.dateOfBirth) {
        payload.dateOfBirth = new Date(clientForm.dateOfBirth).toISOString();
      }
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Client added successfully");
        setIsClientModalOpen(false);
        setClientForm({
          name: "",
          email: "",
          phone: "+91",
          dateOfBirth: "",
          address: "",
          notes: "",
        });
        refetchClients();
      } else {
        errorToast(data.error || "Failed to add client");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim()) {
      errorToast("Name is required");
      return;
    }
    if (!staffForm.email.trim()) {
      errorToast("Email is required");
      return;
    }
    setStaffSubmitting(true);
    try {
      const payload: any = {
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: (staffForm.phone.trim() === "+91" || !staffForm.phone.trim()) ? undefined : staffForm.phone.trim(),
        role: staffForm.role,
        salary: staffForm.salary ? Number(staffForm.salary) : 0,
        bio: staffForm.bio.trim() || undefined,
        imageUrl: staffForm.imageUrl.trim() || undefined,
        serviceIds: staffForm.serviceIds,
        identityProof: staffFileBase64 || undefined,
        identityProofName: staffFile?.name || undefined,
      };
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Staff member added successfully");
        setIsStaffModalOpen(false);
        setStaffForm({
          name: "",
          email: "",
          phone: "+91",
          role: "STYLIST",
          salary: "",
          bio: "",
          imageUrl: "",
          serviceIds: [],
        });
        setStaffFile(null);
        setStaffFileBase64(null);
        refetchStaff();
      } else {
        errorToast(data.error || "Failed to add staff member");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    } finally {
      setStaffSubmitting(false);
    }
  };

  const openEditClient = (client: any) => {
    setEditingClient(client);
    setClientEditForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "+91",
      dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString().split("T")[0] : "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setIsEditClientModalOpen(true);
  };

  const handleEditClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEditForm.name.trim()) {
      errorToast("Name is required");
      return;
    }
    if (!clientEditForm.phone.trim() || clientEditForm.phone.trim() === "+91") {
      errorToast("Phone number is required");
      return;
    }
    setClientEditSubmitting(true);
    try {
      const payload: any = {
        name: clientEditForm.name.trim(),
        email: clientEditForm.email.trim() || null,
        phone: clientEditForm.phone.trim(),
        address: clientEditForm.address.trim() || null,
        notes: clientEditForm.notes.trim() || null,
      };
      if (clientEditForm.dateOfBirth) {
        payload.dateOfBirth = new Date(clientEditForm.dateOfBirth).toISOString();
      } else {
        payload.dateOfBirth = null;
      }
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Client updated successfully");
        setIsEditClientModalOpen(false);
        setSelectedClientId(null);
        refetchClients();
      } else {
        errorToast(data.error || "Failed to update client");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    } finally {
      setClientEditSubmitting(false);
    }
  };

  const handleRemoveClient = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this client? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Client removed successfully");
        setSelectedClientId(null);
        refetchClients();
      } else {
        errorToast(data.error || "Failed to remove client");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    }
  };

  const openEditStaff = (staff: any) => {
    setEditingStaff(staff);
    setStaffEditForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || "+91",
      role: staff.role,
      salary: String(staff.salary || ""),
      bio: staff.bio || "",
      imageUrl: staff.imageUrl || "",
      serviceIds: (staff.staffServices ?? []).map((ss: any) => ss.serviceId),
    });
    setStaffEditFile(null);
    setStaffEditFileBase64(null);
    setIsEditStaffModalOpen(true);
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEditForm.name.trim()) {
      errorToast("Name is required");
      return;
    }
    if (!staffEditForm.email.trim()) {
      errorToast("Email is required");
      return;
    }
    setStaffEditSubmitting(true);
    try {
      const payload: any = {
        name: staffEditForm.name.trim(),
        email: staffEditForm.email.trim(),
        phone: (staffEditForm.phone.trim() === "+91" || !staffEditForm.phone.trim()) ? null : staffEditForm.phone.trim(),
        role: staffEditForm.role,
        salary: staffEditForm.salary ? Number(staffEditForm.salary) : 0,
        bio: staffEditForm.bio.trim() || null,
        imageUrl: staffEditForm.imageUrl.trim() || null,
        serviceIds: staffEditForm.serviceIds,
      };
      if (staffEditFileBase64) {
        payload.identityProof = staffEditFileBase64;
        payload.identityProofName = staffEditFile?.name;
      }
      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Staff member updated successfully");
        setIsEditStaffModalOpen(false);
        setSelectedStaffId(null);
        refetchStaff();
      } else {
        errorToast(data.error || "Failed to update staff member");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    } finally {
      setStaffEditSubmitting(false);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this staff member? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successToast("Staff member removed successfully");
        setSelectedStaffId(null);
        refetchStaff();
      } else {
        errorToast(data.error || "Failed to remove staff member");
      }
    } catch (err: any) {
      errorToast(err.message || "An error occurred");
    }
  };

  const staffCompletedAppts = (staffDetail?.appointments ?? []).filter((a: any) => a.status === "COMPLETED");
  const staffTotalRevenue = staffCompletedAppts.reduce((sum: number, a: any) => sum + Number(a.price), 0);

  const isAnyModalOpen = !!selectedClientId || !!selectedStaffId;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-400" /> Clients & Staff
          </h1>
          <p className="page-subtitle">
            {activeTab === "clients"
              ? `${clientPagination?.total ?? 0} total clients`
              : `${staffPagination?.total ?? 0} total staff members`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs Selector */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
            <button
              onClick={() => setActiveTab("clients")}
              className={`period-pill ${activeTab === "clients" ? "active" : ""}`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`period-pill ${activeTab === "staff" ? "active" : ""}`}
            >
              Staff
            </button>
          </div>
          {activeTab === "clients" ? (
            <button onClick={() => setIsClientModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>
          ) : (
            <button onClick={() => setIsStaffModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Staff</button>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === "clients" ? (
        <div className="space-y-6">
          {/* Client Filters */}
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search by name, email, phone..." className="input-field pl-10 w-full"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIERS.map(t => {
                const ts = TIER_STYLES[t];
                return (
                  <button key={t} onClick={() => { setTier(t); setPage(1); }}
                    className={`filter-pill text-xs ${tier === t ? "active" : ""}`}
                    style={tier === t && ts ? { background: ts.bg, color: ts.color, borderColor: ts.color + "40" } : {}}>
                    {ts?.icon ?? ""} {t === "All" ? "All Tiers" : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loyalty Program Guide Banner */}
          <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-3 md:border-r border-[var(--border-subtle)] md:pr-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">Loyalty Program</h3>
                <h4 className="text-base font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>Guide & Rewards</h4>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Earn points automatically as you spend on services or products. Upgrade tiers dynamically!
                </p>
              </div>
            </div>

            <div className="md:col-span-3 md:border-r border-[var(--border-subtle)] md:px-6 h-full">
              <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">How it Works</h3>
              <div className="space-y-2">
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  You earn <strong className="text-rose-400 font-semibold">1 Loyalty Point</strong> for every <strong style={{ color: "var(--text-primary)" }}>₹100</strong> spent at our salon.
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Points are calculated dynamically upon checkout.
                </p>
              </div>
            </div>

            <div className="md:col-span-6 md:pl-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3">Upgrade Milestones</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Silver Tier", pts: "100 pts", spent: "₹10,000 spend", color: "#94a3b8", bg: "rgba(148,163,184,0.06)" },
                  { name: "Gold Tier", pts: "250 pts", spent: "₹25,000 spend", color: "#fbbf24", bg: "rgba(251,191,36,0.06)" },
                  { name: "Platinum Tier", pts: "500+ pts", spent: "₹50,000 spend", color: "#e2e8f0", bg: "rgba(226,232,240,0.06)" },
                ].map(t => (
                  <div key={t.name} className="p-3 rounded-xl border border-white/[0.03] flex flex-col justify-between" style={{ background: t.bg }}>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                      <p className="text-sm font-black mt-1" style={{ color: t.color }}>{t.pts}</p>
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>{t.spent}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientsLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 rounded bg-white/[0.06]" />
                        <div className="h-3 w-24 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {Array(3).fill(0).map((_, j) => <div key={j} className="h-12 rounded-lg bg-white/[0.04]" />)}
                    </div>
                  </div>
                ))
              : clients.map(client => {
                  const ts = TIER_STYLES[client.tier] ?? TIER_STYLES.BRONZE;
                  const initials = client.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={client.id} onClick={() => setSelectedClientId(client.id)}
                      className="glass-card p-5 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                      {/* Avatar + tier */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: "linear-gradient(135deg, #f43f5e22, #a855f722)", color: "#fb7185", border: "2px solid #f43f5e30" }}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                            <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                              <Mail className="w-3 h-3" />{client.email}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ background: ts.bg, color: ts.color }}>
                          {ts.icon} {client.tier.charAt(0) + client.tier.slice(1).toLowerCase()}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: "Spent", value: `₹${(Number(client.totalSpent)/1000).toFixed(1)}k` },
                          { label: "Visits", value: client.totalVisits },
                          { label: "Points", value: client.loyaltyPoints },
                        ].map(s => (
                          <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: "var(--bg-card)" }}>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Contact */}
                      {client.phone && (
                        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <Phone className="w-3 h-3" />{client.phone}
                        </p>
                      )}

                      {/* Loyalty bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                          <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5" /> {client.loyaltyPoints} pts</span>
                          <span>Next tier</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (client.loyaltyPoints % 1000) / 10)}%`, background: ts.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Client Pagination */}
          {clientPagination && clientPagination.totalPages > 1 && (
            <div className="flex items-center justify-between glass-card px-5 py-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Page {page} of {clientPagination.totalPages} · {clientPagination.total} clients
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-icon w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="btn-icon w-8 h-8" disabled={page === clientPagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Staff Filters */}
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search by name, email..." className="input-field pl-10 w-full"
                value={staffSearch} onChange={e => { setStaffSearch(e.target.value); setStaffPage(1); }} />
            </div>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {staffLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 rounded bg-white/[0.06]" />
                        <div className="h-3 w-24 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Array(2).fill(0).map((_, j) => <div key={j} className="h-12 rounded-lg bg-white/[0.04]" />)}
                    </div>
                  </div>
                ))
              : staffList.map(s => {
                  const initials = s.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const colors = ["#f43f5e", "#a855f7", "#fbbf24", "#06b6d4", "#10b981"];
                  const clr = colors[s.name.charCodeAt(0) % colors.length];
                  return (
                    <div key={s.id} onClick={() => setSelectedStaffId(s.id)}
                      className="glass-card p-5 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                      {/* Avatar + Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: `${clr}15`, color: clr, border: `2px solid ${clr}30` }}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                            <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                              <Mail className="w-3 h-3" />{s.email}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{
                            background: s.status === "ACTIVE" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                            color: s.status === "ACTIVE" ? "#10b981" : "#f59e0b"
                          }}>
                          {s.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-center p-2.5 rounded-xl" style={{ background: "var(--bg-card)" }}>
                          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s._count?.appointments ?? 0}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Bookings</p>
                        </div>
                        <div className="text-center p-2.5 rounded-xl flex flex-col justify-center min-w-0" style={{ background: "var(--bg-card)" }}>
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{s.role.replace("_", " ")}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Role</p>
                        </div>
                      </div>

                      {/* Contact */}
                      {s.phone && (
                        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <Phone className="w-3 h-3" />{s.phone}
                        </p>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Staff Pagination */}
          {staffPagination && staffPagination.totalPages > 1 && (
            <div className="flex items-center justify-between glass-card px-5 py-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Page {staffPage} of {staffPagination.totalPages} · {staffPagination.total} staff members
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-icon w-8 h-8" disabled={staffPage === 1} onClick={() => setStaffPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="btn-icon w-8 h-8" disabled={staffPage === staffPagination.totalPages} onClick={() => setStaffPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Client details modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedClientId && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                className="fixed inset-0 z-[9980]"
                style={{ background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedClientId(null)}
            />

            {/* Modal Content Wrapper */}
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className="relative w-full max-w-3xl flex flex-col rounded-2xl overflow-hidden p-6 pointer-events-auto"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                  maxHeight: "85vh"
                }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                {clientDetailLoading ? (
                  <div className="h-10 w-48 rounded bg-white/[0.04] animate-pulse" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #f43f5e22, #a855f722)", color: "#fb7185", border: "2px solid #f43f5e30" }}>
                      {clientDetail?.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{clientDetail?.name}</h3>
                      <div className="text-sm flex flex-wrap items-center gap-3 mt-1" style={{ color: "var(--text-muted)" }}>
                        {clientDetail?.email && (
                          <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-rose-400" /> {clientDetail?.email}</span>
                        )}
                        {clientDetail?.phone && (
                          <>
                            {clientDetail?.email && <span className="hidden sm:inline opacity-45">·</span>}
                            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-rose-400" /> {clientDetail?.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!clientDetailLoading && clientDetail && (
                    <>
                      <button onClick={() => openEditClient(clientDetail)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleRemoveClient(clientDetail.id)} className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-3 py-1.5 flex items-center gap-1">
                        <Trash className="w-3.5 h-3.5" /> Remove
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedClientId(null)} className="btn-icon w-8 h-8">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {clientDetailLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                </div>
              ) : (() => {
                const serviceCounts = (clientDetail?.appointments ?? [])
                  .filter((appt: any) => appt.status === "COMPLETED")
                  .reduce((acc: Record<string, { name: string; count: number }>, appt: any) => {
                    const name = appt.service?.name || "Product Sale";
                    if (!acc[name]) {
                      acc[name] = { name, count: 0 };
                    }
                    acc[name].count += 1;
                    return acc;
                  }, {});
                const popularServices = Object.values(serviceCounts).sort((a: any, b: any) => b.count - a.count);

                const currentSpent = Number(clientDetail?.totalSpent || 0);

                return (
                  <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">₹{currentSpent.toLocaleString("en-IN")}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Total Spent</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">{clientDetail?.totalVisits || 0}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Total Visits</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">{clientDetail?.loyaltyPoints || 0}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Loyalty Points</p>
                      </div>
                    </div>

                    {/* Most Popular Services */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                        Most Popular Services
                      </h4>
                      {popularServices.length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border-subtle)]" style={{ color: "var(--text-muted)" }}>
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-25" />
                          <p className="text-sm">No services availed yet</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {popularServices.map((item: any) => (
                            <div
                              key={item.name}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]"
                              style={{ background: "var(--bg-card)" }}
                            >
                              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                {item.name}
                              </span>
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-400/15 px-1.5 py-0.5 rounded-full">
                                ×{item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      , document.body)}

      {/* Staff details modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedStaffId && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                className="fixed inset-0 z-[9980]"
                style={{ background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStaffId(null)}
            />

            {/* Modal Content Wrapper */}
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className="relative w-full max-w-4xl flex flex-col rounded-2xl overflow-hidden p-6 pointer-events-auto"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                  maxHeight: "85vh"
                }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                {staffDetailLoading ? (
                  <div className="h-10 w-48 rounded bg-white/[0.04] animate-pulse" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #06b6d422, #10b98122)", color: "#06b6d4", border: "2px solid #06b6d430" }}>
                      {staffDetail?.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{staffDetail?.name}</h3>
                      <div className="text-sm flex flex-wrap items-center gap-3 mt-1" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-cyan-400" /> {staffDetail?.email}</span>
                        {staffDetail?.phone && (
                          <>
                            <span className="hidden sm:inline opacity-45">·</span>
                            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-cyan-400" /> {staffDetail?.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!staffDetailLoading && staffDetail && (
                    <>
                      <button onClick={() => openEditStaff(staffDetail)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleRemoveStaff(staffDetail.id)} className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-3 py-1.5 flex items-center gap-1">
                        <Trash className="w-3.5 h-3.5" /> Remove
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedStaffId(null)} className="btn-icon w-8 h-8">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {staffDetailLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                </div>
              ) : (() => {
                const clientBreakdown = staffCompletedAppts.reduce((acc: Record<string, { name: string; amount: number; count: number }>, appt: any) => {
                  const clientId = appt.client?.id || "walkin";
                  const clientName = appt.client?.name || "Walk-in Client";
                  const price = Number(appt.price);
                  if (!acc[clientId]) {
                    acc[clientId] = { name: clientName, amount: 0, count: 0 };
                  }
                  acc[clientId].amount += price;
                  acc[clientId].count += 1;
                  return acc;
                }, {});
                const clientBreakdownList = Object.values(clientBreakdown).sort((a: any, b: any) => b.amount - a.amount);

                return (
                  <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">₹{staffTotalRevenue.toLocaleString("en-IN")}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Revenue Generated</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">{staffCompletedAppts.length}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Completed Services</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl" style={{ background: "var(--bg-card)" }}>
                        <p className="text-lg font-bold text-gradient">₹{Number(staffDetail?.salary || 0).toLocaleString("en-IN")}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Salary</p>
                      </div>
                    </div>

                    {/* Identity Proof Section */}
                    {staffDetail?.identityProof && (
                      <div className="p-4 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between" style={{ background: "var(--bg-card)" }}>
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Identity Proof</p>
                            <p className="text-sm font-bold truncate max-w-[250px]" style={{ color: "var(--text-primary)" }}>
                              {staffDetail?.identityProofName || "Uploaded Document"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewIdentityProof(staffDetail.identityProof, staffDetail.identityProofName)}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          View Identity Proof
                        </button>
                      </div>
                    )}
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Services rendered list */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Services Rendered
                        </h4>
                        {staffCompletedAppts.length === 0 ? (
                          <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border-subtle)]" style={{ color: "var(--text-muted)" }}>
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p className="text-sm">No services rendered yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                            {staffCompletedAppts.map((appt: any) => {
                              const formattedDate = new Date(appt.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: "UTC"
                              });
                              return (
                                <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)]" style={{ background: "var(--bg-card)" }}>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                      {appt.service?.name ?? "Service"}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                      {formattedDate} · Client: {appt.client?.name ?? "Walk-in"}
                                    </p>
                                  </div>
                                  <span className="text-sm font-bold text-emerald-500">
                                    +₹{Number(appt.price).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Revenue Taken from Each Client */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Revenue by Client
                        </h4>
                        {clientBreakdownList.length === 0 ? (
                          <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border-subtle)]" style={{ color: "var(--text-muted)" }}>
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p className="text-sm">No client data available</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                            {clientBreakdownList.map((item: any) => (
                              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)]" style={{ background: "var(--bg-card)" }}>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.count} {item.count === 1 ? 'service' : 'services'}</p>
                                </div>
                                <span className="text-sm font-bold text-emerald-500">
                                  ₹{item.amount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      , document.body)}

      {/* Add Client Modal */}
      <Modal
        open={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Add New Client"
        subtitle="Create a new client profile in the salon database."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsClientModalOpen(false)}
              disabled={clientSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddClient}
              disabled={clientSubmitting}
            >
              {clientSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Adding...
                </>
              ) : (
                "Add Client"
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="input-field"
              value={clientForm.name}
              onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email Address (optional)
              </label>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                className="input-field"
                value={clientForm.email}
                onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Phone Number *
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                className="input-field"
                value={clientForm.phone}
                onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Format: +[country_code] [10 digits], e.g. +91 9876543210
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Date of Birth (optional)
            </label>
            <input
              type="date"
              className="input-field"
              value={clientForm.dateOfBirth}
              onChange={e => setClientForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Address (optional)
            </label>
            <input
              type="text"
              placeholder="Street address, City"
              className="input-field"
              value={clientForm.address}
              onChange={e => setClientForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Notes (optional)
            </label>
            <textarea
              placeholder="Any specific preferences or medical notes..."
              rows={2}
              className="input-field py-2"
              value={clientForm.notes}
              onChange={e => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Add Staff Modal */}
      <Modal
        open={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Add New Staff Member"
        subtitle="Register a new salon employee and set their role and salary."
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsStaffModalOpen(false)}
              disabled={staffSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddStaff}
              disabled={staffSubmitting}
            >
              {staffSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Adding...
                </>
              ) : (
                "Add Staff"
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                className="input-field"
                value={staffForm.name}
                onChange={e => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. jane@salon.com"
                className="input-field"
                value={staffForm.email}
                onChange={e => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Phone Number (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                className="input-field"
                value={staffForm.phone}
                onChange={e => setStaffForm(prev => ({ ...prev, phone: e.target.value }))}
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Format: +[country_code] [10 digits], e.g. +91 9876543210
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Identity Proof (optional, PDF or Image)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="input-field"
                onChange={handleStaffFileChange}
              />
              {staffFile && (
                <p className="text-[10px] text-emerald-400">
                  Selected: {staffFile.name} ({(staffFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Role *
              </label>
              <div className="relative">
                <select
                  className="select-field w-full pr-10"
                  value={staffForm.role}
                  onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="STYLIST">Stylist</option>
                  <option value="SENIOR_STYLIST">Senior Stylist</option>
                  <option value="ESTHETICIAN">Esthetician</option>
                  <option value="NAIL_TECHNICIAN">Nail Technician</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Salary (₹/month) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="input-field"
                value={staffForm.salary}
                onChange={e => setStaffForm(prev => ({ ...prev, salary: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Staff Bio (optional)
              </label>
              <textarea
                placeholder="Brief professional bio..."
                rows={2}
                className="input-field py-2"
                value={staffForm.bio}
                onChange={e => setStaffForm(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Avatar Image URL (optional)
              </label>
              <input
                type="url"
                placeholder="e.g. https://images.unsplash.com/..."
                className="input-field"
                value={staffForm.imageUrl}
                onChange={e => setStaffForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
          </div>

          {/* Service checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Assigned Services
            </label>
            {allServices.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No services available in the system.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-3 rounded-xl border border-[var(--border-subtle)]" style={{ background: "var(--bg-card)" }}>
                {allServices.map((service: any) => {
                  const isChecked = staffForm.serviceIds.includes(service.id);
                  return (
                    <label key={service.id} className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-[var(--border-default)] text-rose-500 focus:ring-rose-500"
                        checked={isChecked}
                        onChange={() => {
                          const newIds = isChecked
                            ? staffForm.serviceIds.filter(id => id !== service.id)
                            : [...staffForm.serviceIds, service.id];
                          setStaffForm(prev => ({ ...prev, serviceIds: newIds }));
                        }}
                      />
                      <div className="text-xs">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{service.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{service.category}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        open={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        title="Edit Client"
        subtitle="Update client profile details."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditClientModalOpen(false)}
              disabled={clientEditSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleEditClientSubmit}
              disabled={clientEditSubmitting}
            >
              {clientEditSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditClientSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="input-field"
              value={clientEditForm.name}
              onChange={e => setClientEditForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email Address (optional)
              </label>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                className="input-field"
                value={clientEditForm.email}
                onChange={e => setClientEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Phone Number *
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                className="input-field"
                value={clientEditForm.phone}
                onChange={e => setClientEditForm(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Format: +[country_code] [10 digits], e.g. +91 9876543210
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Date of Birth (optional)
            </label>
            <input
              type="date"
              className="input-field"
              value={clientEditForm.dateOfBirth}
              onChange={e => setClientEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Address (optional)
            </label>
            <input
              type="text"
              placeholder="Street address, City"
              className="input-field"
              value={clientEditForm.address}
              onChange={e => setClientEditForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Notes (optional)
            </label>
            <textarea
              placeholder="Any specific preferences or medical notes..."
              rows={2}
              className="input-field py-2"
              value={clientEditForm.notes}
              onChange={e => setClientEditForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={isEditStaffModalOpen}
        onClose={() => setIsEditStaffModalOpen(false)}
        title="Edit Staff Member"
        subtitle="Update salon employee details, role, salary, and services."
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditStaffModalOpen(false)}
              disabled={staffEditSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleEditStaffSubmit}
              disabled={staffEditSubmitting}
            >
              {staffEditSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditStaffSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                className="input-field"
                value={staffEditForm.name}
                onChange={e => setStaffEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. jane@salon.com"
                className="input-field"
                value={staffEditForm.email}
                onChange={e => setStaffEditForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Phone Number (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                className="input-field"
                value={staffEditForm.phone}
                onChange={e => setStaffEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Format: +[country_code] [10 digits], e.g. +91 9876543210
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Identity Proof (optional, PDF or Image)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="input-field"
                onChange={handleStaffEditFileChange}
              />
              {staffEditFile ? (
                <p className="text-[10px] text-emerald-400">
                  Selected: {staffEditFile.name} ({(staffEditFile.size / 1024).toFixed(1)} KB)
                </p>
              ) : editingStaff?.identityProofName ? (
                <p className="text-[10px] text-cyan-400">
                  Current file: {editingStaff.identityProofName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Role *
              </label>
              <div className="relative">
                <select
                  className="select-field w-full pr-10"
                  value={staffEditForm.role}
                  onChange={e => setStaffEditForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="STYLIST">Stylist</option>
                  <option value="SENIOR_STYLIST">Senior Stylist</option>
                  <option value="ESTHETICIAN">Esthetician</option>
                  <option value="NAIL_TECHNICIAN">Nail Technician</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Salary (₹/month) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="input-field"
                value={staffEditForm.salary}
                onChange={e => setStaffEditForm(prev => ({ ...prev, salary: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Staff Bio (optional)
              </label>
              <textarea
                placeholder="Brief professional bio..."
                rows={2}
                className="input-field py-2"
                value={staffEditForm.bio}
                onChange={e => setStaffEditForm(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Avatar Image URL (optional)
              </label>
              <input
                type="url"
                placeholder="e.g. https://images.unsplash.com/..."
                className="input-field"
                value={staffEditForm.imageUrl}
                onChange={e => setStaffEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
          </div>

          {/* Service checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Assigned Services
            </label>
            {allServices.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No services available in the system.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-3 rounded-xl border border-[var(--border-subtle)]" style={{ background: "var(--bg-card)" }}>
                {allServices.map((service: any) => {
                  const isChecked = staffEditForm.serviceIds.includes(service.id);
                  return (
                    <label key={service.id} className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-[var(--border-default)] text-rose-500 focus:ring-rose-500"
                        checked={isChecked}
                        onChange={() => {
                          const newIds = isChecked
                            ? staffEditForm.serviceIds.filter(id => id !== service.id)
                            : [...staffEditForm.serviceIds, service.id];
                          setStaffEditForm(prev => ({ ...prev, serviceIds: newIds }));
                        }}
                      />
                      <div className="text-xs">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{service.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{service.category}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-rose)]" /></div>}>
      <ClientsPageContent />
    </Suspense>
  );
}
