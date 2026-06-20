"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  TrendingDown,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  Search,
  Filter,
  Loader2,
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  AlertTriangle,
  Eye,
  Package,
  Tag,
  Percent,
} from "lucide-react";
import { usePaginatedApi } from "@/hooks/useApi";
import { useToast } from "@/context/ToastContext";
import Modal from "@/components/ui/Modal";

// Badge styling helpers
const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case "PRODUCT_PURCHASE":
      return "badge-purple";
    case "STAFF_PAYMENT":
      return "badge-success";
    case "INFRASTRUCTURE":
      return "badge-info";
    case "MISCELLANEOUS":
    default:
      return "badge-neutral";
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "PRODUCT_PURCHASE":
      return "Product Purchase";
    case "STAFF_PAYMENT":
      return "Staff Payment";
    case "INFRASTRUCTURE":
      return "Infrastructure";
    case "MISCELLANEOUS":
    default:
      return "Miscellaneous";
  }
};

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "BILL":
      return "badge-info";
    case "PAYMENT_OUT":
      return "badge-warning";
    case "MISC":
    default:
      return "badge-neutral";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "BILL":
      return "Product Purchase";
    case "PAYMENT_OUT":
      return "Staff Payment";
    case "MISC":
    default:
      return "Miscellaneous";
  }
};

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function ExpensesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const tab = searchParams.get("tab") || "all";
  const createParam = searchParams.get("create");

  // Filters & State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  
  // Aggregate stats
  const [stats, setStats] = useState({
    total: 0,
    bills: 0,
    payments: 0,
    misc: 0,
  });

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formType, setFormType] = useState("BILL");
  const [formCategory, setFormCategory] = useState("PRODUCT_PURCHASE");
  const [formNotes, setFormNotes] = useState("");
  const [formStaffId, setFormStaffId] = useState("");

  // Fetch all staff members for the dropdown
  const { data: staffData } = usePaginatedApi<any>("/api/staff?limit=100");
  const allStaff = staffData || [];

  // Deletion confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState("");
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Detail/receipt view
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Parse receipt line items from notes string
  const parseReceiptItems = (notes: string | null | undefined) => {
    if (!notes) return [];
    const lines = notes.split("\n");
    const items: { name: string; qty: number; unitPrice: number; discount: number; taxRate: number; total: number }[] = [];
    for (const line of lines) {
      // Pattern: "- Product Name (x3) @ ₹250.00 | Disc: 5% | Tax: 12% | Total: ₹798.75"
      const match = line.match(/^-\s+(.+)\s+\(x(\d+)\)\s+@\s+₹([\d.]+)\s+\|\s+Disc:\s+([\d.]+)%\s+\|\s+Tax:\s+([\d.]+)%\s+\|\s+Total:\s+₹([\d.]+)/);
      if (match) {
        items.push({
          name: match[1].trim(),
          qty: parseInt(match[2], 10),
          unitPrice: parseFloat(match[3]),
          discount: parseFloat(match[4]),
          taxRate: parseFloat(match[5]),
          total: parseFloat(match[6]),
        });
      }
    }
    return items;
  };

  const isInvoiceScan = (expense: any) =>
    expense.title?.startsWith("Invoice Scan Purchase");

  // API Call
  const params = new URLSearchParams({ page: String(page), limit: "15" });
  if (tab === "bills") {
    params.set("type", "BILL");
  } else if (tab === "payment-out") {
    params.set("type", "PAYMENT_OUT");
  } else if (tab === "misc") {
    params.set("type", "MISC");
  }

  if (search) {
    params.set("search", search);
  }
  if (startDate) {
    params.set("startDate", startDate);
  }
  if (endDate) {
    params.set("endDate", endDate);
  }

  const { data: expenses, pagination, loading, refetch } = usePaginatedApi<any>(`/api/expenses?${params.toString()}`);

  // Fetch all for stats aggregation (filtered by selected date ranges too)
  useEffect(() => {
    const statsParams = new URLSearchParams({ limit: "5000" });
    if (startDate) statsParams.set("startDate", startDate);
    if (endDate) statsParams.set("endDate", endDate);

    fetch(`/api/expenses?${statsParams.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.data) {
          let total = 0;
          let bills = 0;
          let payments = 0;
          let misc = 0;
          d.data.forEach((exp: any) => {
            const amt = Number(exp.amount) || 0;
            total += amt;
            if (exp.type === "BILL") bills += amt;
            else if (exp.type === "PAYMENT_OUT") payments += amt;
            else if (exp.type === "MISC") misc += amt;
          });
          setStats({ total, bills, payments, misc });
        }
      })
      .catch((e) => console.error("Error loading stats:", e));
  }, [expenses, startDate, endDate]);

  // Open modal if create parameter is present
  useEffect(() => {
    if (createParam === "true") {
      setIsModalOpen(true);
      if (tab === "bills") {
        setFormType("BILL");
        setFormCategory("PRODUCT_PURCHASE");
      } else if (tab === "payment-out") {
        setFormType("PAYMENT_OUT");
        setFormCategory("STAFF_PAYMENT");
      } else {
        setFormType("MISC");
        setFormCategory("MISCELLANEOUS");
      }
    }
  }, [createParam, tab]);

  const resetForm = () => {
    setFormTitle("");
    setFormAmount("");
    setFormDate(getTodayDateString());
    setFormType(tab === "bills" ? "BILL" : tab === "payment-out" ? "PAYMENT_OUT" : "MISC");
    setFormCategory(tab === "bills" ? "PRODUCT_PURCHASE" : tab === "payment-out" ? "STAFF_PAYMENT" : "MISCELLANEOUS");
    setFormNotes("");
    setFormStaffId("");
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      error("Title is required");
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      error("Amount must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          amount: amt,
          type: formType,
          category: formCategory,
          date: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
          notes: formNotes.trim() || undefined,
          staffId: formType === "PAYMENT_OUT" && formStaffId ? formStaffId : undefined,
        }),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        success("Expense saved successfully");
        setIsModalOpen(false);
        resetForm();
        if (createParam) {
          router.push(`/expenses?tab=${tab}`);
        }
        refetch();
      } else {
        error(d.error || "Failed to save expense");
      }
    } catch (err: any) {
      error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDelete = (id: string, title: string) => {
    setDeletingId(id);
    setDeletingTitle(title);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/expenses/${deletingId}`, { method: "DELETE" });
      const d = await res.json();
      if (res.ok && d.success) {
        success("Expense deleted successfully");
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        refetch();
      } else {
        error(d.error || "Failed to delete expense");
      }
    } catch (err: any) {
      error(err.message || "An error occurred");
    } finally {
      setDeletingLoading(false);
    }
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "bills", label: "Product Purchase" },
    { id: "payment-out", label: "Staff Payment" },
    { id: "misc", label: "Miscellaneous" },
  ];

  return (
    <>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Expenses Dashboard</h1>
          <p className="page-subtitle">Track salon bills, wages, utility expenses and product restocks.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total */}
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: "120px" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Total Expenses</p>
              <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{stats.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-[rgba(244,63,94,0.08)] text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Accumulated cash outflow</p>
        </div>

        {/* Card 2: Bills */}
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: "120px" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Product Purchase</p>
              <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{stats.bills.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-[rgba(6,182,212,0.08)] text-cyan-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Logged supplier bills & receipts</p>
        </div>

        {/* Card 3: Payments Out */}
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: "120px" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Staff Payment</p>
              <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{stats.payments.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-[rgba(245,158,11,0.08)] text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Staff payments & utility bills</p>
        </div>

        {/* Card 4: Misc */}
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: "120px" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Miscellaneous</p>
              <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{stats.misc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-[rgba(168,85,247,0.08)] text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Other petty payments</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl self-start" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                router.push(`/expenses?tab=${t.id}`);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(244,63,94,0.08)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search, Filter & Action button */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by title or notes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="input-field text-xs py-1.5 px-2.5 w-32"
                style={{ background: "var(--bg-card)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="input-field text-xs py-1.5 px-2.5 w-32"
                style={{ background: "var(--bg-card)" }}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                className="text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]"
                style={{ color: "var(--accent-rose-light)" }}
              >
                Clear Dates
              </button>
            )}

            <button
              onClick={() => {
                setIsModalOpen(true);
                setFormType(tab === "bills" ? "BILL" : tab === "payment-out" ? "PAYMENT_OUT" : "MISC");
                setFormCategory(tab === "bills" ? "PRODUCT_PURCHASE" : tab === "payment-out" ? "STAFF_PAYMENT" : "MISCELLANEOUS");
              }}
              className="btn-primary flex items-center gap-1.5 px-4"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Date</th>
                  <th>Title / Notes</th>
                  <th style={{ width: "160px" }}>Expense Type</th>
                  <th style={{ width: "150px" }}>Amount</th>
                  <th style={{ width: "60px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-rose)]" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                      No expenses found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => {
                    const isReceipt = isInvoiceScan(expense);
                    return (
                      <tr
                        key={expense.id}
                        className={isReceipt ? "cursor-pointer transition-colors hover:bg-[rgba(244,63,94,0.04)]" : ""}
                        onClick={isReceipt ? () => setSelectedExpense(expense) : undefined}
                        title={isReceipt ? "Click to view receipt details" : undefined}
                      >
                        <td className="whitespace-nowrap font-medium text-xs">
                          <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                            <Calendar className="w-3.5 h-3.5 opacity-65" />
                            {new Date(expense.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                              {expense.title}
                            </div>
                            {expense.staff && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                                Paid to: {expense.staff.name}
                              </span>
                            )}
                            {isReceipt && (
                              <span
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                style={{ background: "rgba(244,63,94,0.1)", color: "var(--accent-rose-light)" }}
                              >
                                <Eye style={{ width: "10px", height: "10px" }} /> View
                              </span>
                            )}
                          </div>
                          {!isReceipt && expense.notes && (
                            <div className="text-[11px] mt-0.5 truncate max-w-xs" style={{ color: "var(--text-muted)" }}>
                              {expense.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge-purple px-2 py-0.5 rounded-full text-[10px] font-semibold ${getCategoryBadgeClass(expense.category)}`}>
                            {getCategoryLabel(expense.category)}
                          </span>
                        </td>
                        <td className="font-bold font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                          ₹{Number(expense.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => triggerDelete(expense.id, expense.title)}
                            className="btn-icon w-7 h-7"
                            style={{ color: "#f87171" }}
                            title="Delete Expense Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-icon w-8 h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm tabular-nums font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {page} / {pagination.totalPages}
                </span>
                <button className="btn-icon w-8 h-8" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (createParam) {
            router.push(`/expenses?tab=${tab}`);
          }
          resetForm();
        }}
        title="Record New Expense"
        subtitle="Log an outflow of cash for bills, wages, rent, or other miscellaneous payments."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsModalOpen(false);
                if (createParam) {
                  router.push(`/expenses?tab=${tab}`);
                }
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...
                </>
              ) : (
                "Save Expense"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Expense Title / Description *
            </label>
            <input
              type="text"
              placeholder="e.g., Staff weekly wage, Office electricity bill"
              className="input-field"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          {/* Amount and Date row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="input-field"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Type row */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Expense Type *
              </label>
              <div className="relative">
                <select
                  className="select-field w-full pr-10"
                  value={formType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormType(val);
                    // Automatically change category defaults
                    if (val === "BILL") setFormCategory("PRODUCT_PURCHASE");
                    else if (val === "PAYMENT_OUT") setFormCategory("STAFF_PAYMENT");
                    else setFormCategory("MISCELLANEOUS");
                  }}
                >
                  <option value="BILL">Product Purchase</option>
                  <option value="PAYMENT_OUT">Staff Payment</option>
                  <option value="MISC">Miscellaneous</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            {/* If Expense Type is Staff Payment, show option to select staff member */}
            {formType === "PAYMENT_OUT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Select Staff Member *
                </label>
                <div className="relative">
                  <select
                    className="select-field w-full pr-10"
                    value={formStaffId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setFormStaffId(selectedId);
                      const selectedStaff = allStaff.find((s: any) => s.id === selectedId);
                      if (selectedStaff) {
                        setFormAmount(String(selectedStaff.salary || "0"));
                        if (!formTitle.trim() || allStaff.some((s: any) => formTitle.includes(s.name) || formTitle.startsWith("Staff Payment"))) {
                          setFormTitle(`Staff Payment - ${selectedStaff.name}`);
                        }
                      }
                    }}
                    required
                  >
                    <option value="">-- Choose Staff --</option>
                    {allStaff.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role.replace("_", " ")}) - Salary: ₹{Number(s.salary || 0).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
            )}

            {/* If Expense Type is Product Purchase, show options to add Product or Scan Invoice */}
            {formType === "BILL" && (
              <div className="p-3 rounded-xl flex flex-col gap-2 bg-[rgba(244,63,94,0.04)] border border-[rgba(244,63,94,0.12)]">
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Need to add inventory items or scan a receipt?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/products?openAddProduct=true")}
                    className="btn-secondary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Single Product
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/products?openScanner=true")}
                    className="btn-primary py-1.5 px-3 text-[11px] flex items-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Scan Invoice Receipt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Notes / Remarks
            </label>
            <textarea
              placeholder="Provide any additional details or invoice numbers..."
              rows={3}
              className="input-field py-2"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        title="Delete Expense Record"
        subtitle={`Are you sure you want to delete the expense record for "${deletingTitle}"?`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingId(null);
              }}
              disabled={deletingLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={confirmDelete}
              disabled={deletingLoading}
            >
              {deletingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <p className="text-xs leading-relaxed font-semibold">
            Warning: Deleting this expense record is permanent. This cannot be undone and will immediately affect the aggregate financials on your dashboard.
          </p>
        </div>
      </Modal>
    </div>

      {/* Receipt Detail Modal */}
      {selectedExpense && (() => {
        const items = parseReceiptItems(selectedExpense.notes);
        const dateStr = new Date(selectedExpense.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return (
          <Modal
            open={!!selectedExpense}
            onClose={() => setSelectedExpense(null)}
            title="Invoice Receipt Summary"
            subtitle={`${selectedExpense.title} · ${dateStr}`}
            size="lg"
            footer={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedExpense(null)}
              >
                Close
              </button>
            }
          >
            <div className="space-y-4">
              {/* Summary banner */}
              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(244,63,94,0.12)" }}>
                    <Receipt className="w-4 h-4" style={{ color: "var(--accent-rose-light)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Paid</p>
                    <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                      ₹{Number(selectedExpense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Items</p>
                  <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{items.length}</p>
                </div>
              </div>

              {/* Line items table */}
              {items.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Product</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)", width: "60px" }}>Qty</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)", width: "100px" }}>Unit Price</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)", width: "80px" }}>Disc%</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)", width: "80px" }}>Tax%</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)", width: "110px" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{ borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(168,85,247,0.1)" }}>
                                <Package style={{ width: "12px", height: "12px", color: "#a855f7" }} />
                              </div>
                              <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="font-mono text-xs font-bold" style={{ color: "var(--text-secondary)" }}>×{item.qty}</span>
                          </td>
                          <td className="text-right px-3 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="text-right px-3 py-3">
                            {item.discount > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                                <Tag style={{ width: "9px", height: "9px" }} />{item.discount}%
                              </span>
                            ) : <span className="text-xs" style={{ color: "var(--text-disabled)" }}>—</span>}
                          </td>
                          <td className="text-right px-3 py-3">
                            {item.taxRate > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                                <Percent style={{ width: "9px", height: "9px" }} />{item.taxRate}%
                              </span>
                            ) : <span className="text-xs" style={{ color: "var(--text-disabled)" }}>—</span>}
                          </td>
                          <td className="text-right px-4 py-3 font-bold font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                            ₹{item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--border-subtle)", background: "var(--bg-tertiary)" }}>
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Grand Total</td>
                        <td className="text-right px-4 py-3 font-bold font-mono text-sm" style={{ color: "var(--accent-rose-light)" }}>
                          ₹{Number(selectedExpense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
                  <p>No detailed line items found.</p>
                  {selectedExpense.notes && (
                    <pre className="mt-3 text-xs text-left p-3 rounded-xl overflow-auto" style={{ background: "var(--bg-tertiary)", whiteSpace: "pre-wrap" }}>{selectedExpense.notes}</pre>
                  )}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-rose)]" />
      </div>
    }>
      <ExpensesPageContent />
    </Suspense>
  );
}
