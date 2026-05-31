"use client";

import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Shield,
  Clock,
  Globe,
  CreditCard,
  Users,
  Save,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Upload,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import Modal from "@/components/ui/Modal";

const settingsSections = [
  { id: "profile", label: "Salon Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "hours", label: "Business Hours", icon: Clock },
  { id: "staff", label: "Staff & Roles", icon: Users },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Globe },
];

const STAFF_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "SENIOR_STYLIST", label: "Senior Stylist" },
  { value: "STYLIST", label: "Stylist" },
  { value: "ESTHETICIAN", label: "Esthetician" },
  { value: "NAIL_TECHNICIAN", label: "Nail Technician" },
  { value: "RECEPTIONIST", label: "Receptionist" },
];

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();

  const [activeSection, setActiveSection] = useState("profile");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business Hours state
  const [hours, setHours] = useState<any[]>([]);

  // Staff states
  const [staffs, setStaffs] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STYLIST",
    bio: "",
    password: "",
  });

  // Security (Change Password) state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Billing (Payment Method) state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingForm, setBillingForm] = useState({
    cardNumber: "",
    cardExpiry: "",
  });

  // File Upload Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings?t=${Date.now()}`, { cache: "no-store" });
      const d = await res.json();
      if (d.success && d.data) {
        setSettings(d.data);
        if (d.data.business_hours) {
          setHours(JSON.parse(d.data.business_hours));
        }
      }
    } catch (err: any) {
      toastError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff list
  const fetchStaffs = async () => {
    try {
      setStaffLoading(true);
      const res = await fetch(`/api/staff?limit=100&t=${Date.now()}`, { cache: "no-store" });
      const d = await res.json();
      if (d.data) {
        setStaffs(d.data);
      }
    } catch (err) {
      toastError("Failed to load staff list");
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeSection === "staff") {
      fetchStaffs();
    }
  }, [activeSection]);

  // Handle saving general settings (Profile, Business Hours, etc.)
  const handleSaveSettings = async (updatedFields: Record<string, string>) => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      const d = await res.json();
      if (d.success) {
        success("Settings updated successfully");
        setSettings((prev: any) => ({ ...prev, ...updatedFields }));
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        throw new Error(d.error ?? "Failed to save settings");
      }
    } catch (err: any) {
      toastError(err.message ?? "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Toggle notification values instantly
  const handleToggleNotification = async (key: string) => {
    const newValue = settings[key] === "true" ? "false" : "true";
    // Optimistic UI update
    setSettings((prev: any) => ({ ...prev, [key]: newValue }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      const d = await res.json();
      if (d.success) {
        success("Notification preferences updated");
      } else {
        throw new Error();
      }
    } catch (err) {
      // Rollback
      setSettings((prev: any) => ({ ...prev, [key]: settings[key] }));
      toastError("Failed to update notification preference");
    }
  };

  // Business hours toggle open/close
  const toggleHourDay = (index: number) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, open: !h.open } : h));
  };

  // Business hours change times
  const handleHourTimeChange = (index: number, field: "from" | "to", val: string) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: val } : h));
  };

  // Save business hours
  const handleSaveHours = () => {
    handleSaveSettings({ business_hours: JSON.stringify(hours) });
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated = {
      salon_name: formData.get("salon_name") as string,
      owner_name: formData.get("owner_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gst_number: formData.get("gst_number") as string,
      website: formData.get("website") as string,
      address: formData.get("address") as string,
    };
    handleSaveSettings(updated);
  };

  // Image upload handler (Logo)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await handleSaveSettings({ logo_url: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Appearance tab settings change
  const handleSetThemeMode = async (mode: "light" | "dark") => {
    if (theme !== mode) {
      toggleTheme();
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_mode: mode }),
      });
    }
  };

  const handleSetAccentColor = async (color: string) => {
    setAccentColor(color);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent_color: color }),
    });
    success(`Accent color changed to ${color}`);
  };

  // Security settings (Password update)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toastError("New passwords do not match");
      return;
    }
    if (securityForm.newPassword.length < 8) {
      toastError("New password must be at least 8 characters");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword,
        }),
      });
      const d = await res.json();
      if (d.success) {
        success("Password updated successfully");
        setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toastError(d.error ?? "Failed to update password");
      }
    } catch (err) {
      toastError("An error occurred while changing password");
    } finally {
      setSaving(false);
    }
  };

  // Integrations settings change
  const handleToggleIntegration = async (key: string) => {
    const newValue = settings[key] === "true" ? "false" : "true";
    setSettings((prev: any) => ({ ...prev, [key]: newValue }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      const d = await res.json();
      if (d.success) {
        success("Integration settings updated");
      } else {
        throw new Error();
      }
    } catch (err) {
      setSettings((prev: any) => ({ ...prev, [key]: settings[key] }));
      toastError("Failed to update integration setting");
    }
  };

  // Staff creation/updates
  const handleOpenStaffModal = (staff: any = null) => {
    setEditingStaff(staff);
    if (staff) {
      setStaffForm({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? "",
        role: staff.role,
        bio: staff.bio ?? "",
        password: "",
      });
    } else {
      setStaffForm({
        name: "",
        email: "",
        phone: "",
        role: "STYLIST",
        bio: "",
        password: "",
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffForm.name || !staffForm.email) {
      toastError("Name and Email are required");
      return;
    }

    if (!editingStaff && staffForm.password.length < 8) {
      toastError("Password must be at least 8 characters");
      return;
    }

    // Phone number format validation (Zod matches \+(\d{1,4})\s?\d{10})
    if (staffForm.phone) {
      const phoneRegex = /^\+(\d{1,4})\s?\d{10}$/;
      if (!phoneRegex.test(staffForm.phone)) {
        toastError("Phone number must match format +919876543210 (country code + 10 digits)");
        return;
      }
    }

    try {
      setSaving(true);
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff";
      const method = editingStaff ? "PATCH" : "POST";
      const payload: any = { ...staffForm };
      if (editingStaff && !staffForm.password) {
        delete payload.password; // Do not update password if left blank on edit
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        success(editingStaff ? "Staff member updated" : "Staff member added");
        setIsStaffModalOpen(false);
        fetchStaffs();
      } else {
        toastError(d.error ?? "Failed to save staff member");
      }
    } catch (err) {
      toastError("An error occurred while saving staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (res.ok && d.success) {
        success("Staff member removed");
        fetchStaffs();
      } else {
        toastError(d.error ?? "Failed to delete staff member");
      }
    } catch (err) {
      toastError("An error occurred while deleting staff member");
    }
  };

  // Billing Tab settings change
  const handleUpgradePlan = () => {
    handleSaveSettings({ subscription_plan: "Enterprise" });
  };

  const handleOpenBillingModal = () => {
    setBillingForm({
      cardNumber: settings?.card_number ?? "",
      cardExpiry: settings?.card_expiry ?? "",
    });
    setIsBillingModalOpen(true);
  };

  const handleSaveBilling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.cardNumber || !billingForm.cardExpiry) {
      toastError("All card fields are required");
      return;
    }
    handleSaveSettings({
      card_number: billingForm.cardNumber,
      card_expiry: billingForm.cardExpiry,
    });
    setIsBillingModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-rose-400" />
          Settings
        </h1>
        <p className="page-subtitle">Manage your salon preferences and configuration</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-3 space-y-0.5 h-fit">
          {settingsSections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`nav-link w-full ${activeSection === section.id ? "active" : ""}`}
              >
                <Icon style={{ width: "16px", height: "16px" }} />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="xl:col-span-3 space-y-5">
          
          {/* Salon Profile Tab */}
          {activeSection === "profile" && (
            <form onSubmit={handleSaveProfile} className="glass-card p-6 space-y-6">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Salon Profile</h2>

              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, var(--accent-rose), var(--accent-rose-dark))", boxShadow: "var(--shadow-glow)" }}>
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Salon Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-9 h-9 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Salon Logo</p>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>PNG or JPG, max 2MB, recommended 200×200px</p>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs px-4 py-2 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Change Logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Salon Name</label>
                  <input type="text" name="salon_name" defaultValue={settings.salon_name} placeholder="Enter salon name" className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Owner Name</label>
                  <input type="text" name="owner_name" defaultValue={settings.owner_name} placeholder="Enter owner name" className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Email Address</label>
                  <input type="email" name="email" defaultValue={settings.email} placeholder="Enter email" className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Phone Number</label>
                  <input type="text" name="phone" defaultValue={settings.phone} placeholder="Enter phone" className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>GST Number</label>
                  <input type="text" name="gst_number" defaultValue={settings.gst_number} placeholder="Enter GST number" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Website</label>
                  <input type="text" name="website" defaultValue={settings.website} placeholder="Enter website URL" className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Salon Address</label>
                <textarea name="address" rows={3} defaultValue={settings.address} className="input-field resize-none" required />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => fetchSettings()} className="btn-secondary">Reset</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeSection === "notifications" && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "notification_bookingConfirm", label: "Booking Completions", desc: "Get notified when a booking is completed" },
                  { key: "notification_bookingReminder", label: "Appointment Reminders", desc: "Reminders 24h before appointments" },
                  { key: "notification_lowStock", label: "Low Stock Alerts", desc: "Alert when product stock falls below threshold" },
                  { key: "notification_newClient", label: "New Client Registration", desc: "Notify when a new client registers" },
                  { key: "notification_dailyReport", label: "Daily Revenue Report", desc: "End-of-day revenue summary" },
                  { key: "notification_smsAlerts", label: "SMS Alerts", desc: "Receive critical alerts via SMS" },
                ].map((notif) => {
                  const isChecked = settings[notif.key] === "true";
                  return (
                    <div
                      key={notif.key}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{notif.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{notif.desc}</p>
                      </div>
                      <button
                        onClick={() => handleToggleNotification(notif.key)}
                        className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all"
                        style={{
                          background: isChecked
                            ? "linear-gradient(135deg, var(--accent-rose), var(--accent-rose-dark))"
                            : (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                          border: isChecked ? "1px solid transparent" : "1px solid var(--border-default)",
                          boxShadow: isChecked ? "var(--shadow-glow)" : "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div
                          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                          style={{
                            left: isChecked ? "28px" : "4px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.06)",
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeSection === "appearance" && (
            <div className="glass-card p-6 space-y-6">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Appearance Settings</h2>
              
              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold mb-3 text-[var(--text-muted)]">Theme Mode</label>
                <div className="flex items-center gap-4">
                  {[
                    { mode: "light", label: "Light Theme", icon: Sun },
                    { mode: "dark", label: "Dark Theme", icon: Moon },
                  ].map((tOpt) => {
                    const ThemeIcon = tOpt.icon;
                    const isActive = theme === tOpt.mode;
                    return (
                      <button
                        key={tOpt.mode}
                        onClick={() => handleSetThemeMode(tOpt.mode as any)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isActive
                            ? "border-[var(--accent-rose)] text-[var(--accent-rose)] bg-[var(--accent-rose)]/10"
                            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-white/[0.04]"
                        }`}
                      >
                        <ThemeIcon className="w-4 h-4" />
                        {tOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Palette Selector */}
              <div>
                <label className="block text-xs font-semibold mb-3 text-[var(--text-muted)]">Primary Accent Color</label>
                <div className="flex items-center flex-wrap gap-3">
                  {[
                    { color: "rose", label: "Rose Pink", hex: "#f43f5e" },
                    { color: "purple", label: "Royal Purple", hex: "#a855f7" },
                    { color: "gold", label: "Golden Amber", hex: "#f59e0b" },
                    { color: "teal", label: "Cyan Teal", hex: "#06b6d4" },
                    { color: "green", label: "Emerald Green", hex: "#10b981" },
                  ].map((colorOpt) => {
                    const isActive = accentColor === colorOpt.color;
                    return (
                      <button
                        key={colorOpt.color}
                        onClick={() => handleSetAccentColor(colorOpt.color)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isActive
                            ? "border-[var(--accent-rose)] text-[var(--accent-rose)] bg-[var(--accent-rose)]/5"
                            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: colorOpt.hex }} />
                        {colorOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Business Hours Tab */}
          {activeSection === "hours" && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Business Hours</h2>
              <div className="space-y-3">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button
                      type="button"
                      onClick={() => toggleHourDay(i)}
                      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all"
                      style={{
                        background: h.open
                          ? "linear-gradient(135deg, var(--accent-rose), var(--accent-rose-dark))"
                          : (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                        border: h.open ? "1px solid transparent" : "1px solid var(--border-default)",
                        boxShadow: h.open ? "var(--shadow-glow)" : "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{
                          left: h.open ? "22px" : "2px",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.06)",
                        }}
                      />
                    </button>
                    <span className="w-24 text-sm font-medium flex-shrink-0" style={{ color: h.open ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {h.day}
                    </span>
                    {h.open ? (
                      <div className="flex items-center gap-2 flex-1 animate-fade-in">
                        <input
                          type="time"
                          value={h.from}
                          onChange={(e) => handleHourTimeChange(i, "from", e.target.value)}
                          className="input-field py-1.5 text-xs"
                          style={{ width: "110px" }}
                        />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
                        <input
                          type="time"
                          value={h.to}
                          onChange={(e) => handleHourTimeChange(i, "to", e.target.value)}
                          className="input-field py-1.5 text-xs"
                          style={{ width: "110px" }}
                        />
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Closed</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleSaveHours} className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Hours
                </button>
              </div>
            </div>
          )}

          {/* Staff & Roles Tab */}
          {activeSection === "staff" && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Staff & Roles</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage your stylists and role privileges</p>
                </div>
                <button onClick={() => handleOpenStaffModal()} className="btn-primary text-xs px-4 py-2 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Staff
                </button>
              </div>

              {staffLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-rose)]" />
                </div>
              ) : staffs.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No staff members found.</div>
              ) : (
                <div className="space-y-3">
                  {staffs.map((staff) => (
                    <div key={staff.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 bg-rose-500/10 text-rose-500">
                        {staff.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{staff.name}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{STAFF_ROLES.find(r => r.value === staff.role)?.label ?? staff.role} • {staff.email}</p>
                      </div>
                      <span className={staff.status === "ACTIVE" ? "badge-success" : "badge-warning"}>
                        {staff.status === "ACTIVE" ? "Active" : "On Leave"}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleOpenStaffModal(staff)} className="btn-icon w-8 h-8">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteStaff(staff.id, staff.name)} className="btn-icon w-8 h-8 text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing & Plan Tab */}
          {activeSection === "billing" && (
            <div className="space-y-4">
              <div className="glass-card p-6" style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(168,85,247,0.08) 100%)", border: "1px solid rgba(244,63,94,0.2)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                      <span className="text-sm font-bold text-gradient-gold">{settings.subscription_plan} Plan — Active</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                      {settings.subscription_plan === "Enterprise" ? "Custom Pricing" : "₹2,999"}
                      <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>/month</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next billing date: June 19, 2026</p>
                  </div>
                  {settings.subscription_plan !== "Enterprise" && (
                    <button onClick={handleUpgradePlan} className="btn-gold text-xs px-4 py-2" disabled={saving}>
                      {saving ? "Upgrading..." : "Upgrade to Enterprise"}
                    </button>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex gap-6 border-white/[0.08]">
                  {["Unlimited Bookings", "10 Staff Accounts", "Analytics", "Priority Support"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Payment Method</h3>
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <CreditCard className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{settings.card_number}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Expires {settings.card_expiry}</p>
                  </div>
                  <button onClick={handleOpenBillingModal} className="ml-auto btn-secondary text-xs px-3 py-2">Update</button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeSection === "security" && (
            <form onSubmit={handleChangePassword} className="glass-card p-6 space-y-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Security Settings</h2>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Current Password</label>
                  <input
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>New Password</label>
                  <input
                    type="password"
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Update Password
                </button>
              </div>
            </form>
          )}

          {/* Integrations Tab */}
          {activeSection === "integrations" && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Connected Integrations</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Link external tools to optimize your salon operations</p>
              
              <div className="space-y-4">
                {[
                  { key: "integration_whatsapp", label: "WhatsApp Messaging API", desc: "Automate booking conformations and checkouts via WhatsApp" },
                  { key: "integration_sms", label: "Twilio SMS Service", desc: "Deliver text notifications and appointment reminders to clients" },
                  { key: "integration_custom_domain", label: "Custom Domain Linkage", desc: "Access the salon admin portal using your own domain" },
                ].map((integ) => {
                  const isChecked = settings[integ.key] === "true";
                  return (
                    <div
                      key={integ.key}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{integ.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{integ.desc}</p>
                      </div>
                      <button
                        onClick={() => handleToggleIntegration(integ.key)}
                        className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all"
                        style={{
                          background: isChecked
                            ? "linear-gradient(135deg, var(--accent-rose), var(--accent-rose-dark))"
                            : (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                          border: isChecked ? "1px solid transparent" : "1px solid var(--border-default)",
                          boxShadow: isChecked ? "var(--shadow-glow)" : "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div
                          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                          style={{
                            left: isChecked ? "28px" : "4px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.06)",
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add/Edit Staff Modal */}
      <Modal
        open={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={editingStaff ? "Edit Staff Member" : "Add Staff Member"}
        subtitle="Provide credentials and select appropriate roles"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Full Name</label>
              <input
                type="text"
                value={staffForm.name}
                onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="e.g. Maria Kovac"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Email Address</label>
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
                placeholder="maria@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Phone Number</label>
              <input
                type="text"
                value={staffForm.phone}
                onChange={(e) => setStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
                placeholder="e.g. +919836867607"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Staff Role</label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                className="input-field text-sm cursor-pointer"
                style={{ height: "42px" }}
              >
                {STAFF_ROLES.map(role => (
                  <option key={role.value} value={role.value} style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Short Bio</label>
            <textarea
              value={staffForm.bio}
              onChange={(e) => setStaffForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              placeholder="Tell clients about Maria..."
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">
              {editingStaff ? "New Password (leave blank to keep current)" : "Password"}
            </label>
            <input
              type="password"
              value={staffForm.password}
              onChange={(e) => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="•••••••• (min 8 characters)"
              className="input-field"
              required={!editingStaff}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setIsStaffModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
            <button type="submit" className="btn-primary py-2 px-4 text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Billing Modal */}
      <Modal
        open={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        title="Update Payment Method"
        subtitle="Provide card info for monthly subscription renewal"
      >
        <form onSubmit={handleSaveBilling} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Card Number</label>
            <input
              type="text"
              value={billingForm.cardNumber}
              onChange={(e) => setBillingForm(prev => ({ ...prev, cardNumber: e.target.value }))}
              className="input-field"
              placeholder="e.g. •••• •••• •••• 4242"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-muted)]">Expiration Date</label>
            <input
              type="text"
              value={billingForm.cardExpiry}
              onChange={(e) => setBillingForm(prev => ({ ...prev, cardExpiry: e.target.value }))}
              className="input-field"
              placeholder="e.g. 08/2027"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setIsBillingModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
            <button type="submit" className="btn-primary py-2 px-4 text-xs" disabled={saving}>Update Card</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
