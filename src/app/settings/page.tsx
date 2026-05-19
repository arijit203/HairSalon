"use client";

import {
  Settings,
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
  Smartphone,
} from "lucide-react";
import { useState } from "react";

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

const businessHours = [
  { day: "Monday", open: true, from: "09:00", to: "20:00" },
  { day: "Tuesday", open: true, from: "09:00", to: "20:00" },
  { day: "Wednesday", open: true, from: "09:00", to: "20:00" },
  { day: "Thursday", open: true, from: "09:00", to: "21:00" },
  { day: "Friday", open: true, from: "09:00", to: "21:00" },
  { day: "Saturday", open: true, from: "08:00", to: "22:00" },
  { day: "Sunday", open: false, from: "10:00", to: "18:00" },
];

const staffList = [
  { name: "Maria K.", role: "Senior Stylist", status: "active", color: "#f43f5e" },
  { name: "Jana L.", role: "Esthetician", status: "active", color: "#a855f7" },
  { name: "Priya S.", role: "Nail Technician", status: "active", color: "#fbbf24" },
  { name: "Rina D.", role: "Nail Technician", status: "on-leave", color: "#06b6d4" },
  { name: "Salon Admin", role: "Admin", status: "active", color: "#10b981" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [notifications, setNotifications] = useState({
    bookingConfirm: true,
    bookingReminder: true,
    lowStock: true,
    newClient: false,
    dailyReport: true,
    smsAlerts: false,
  });
  const [hours, setHours] = useState(businessHours);

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleHourDay = (index: number) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, open: !h.open } : h));
  };

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-rose-400" />
          Settings
        </h1>
        <p className="section-subtitle">Manage your salon preferences and configuration</p>
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
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: activeSection === section.id ? "rgba(244,63,94,0.15)" : "transparent",
                  color: activeSection === section.id ? "#fb7185" : "var(--text-muted)",
                  border: activeSection === section.id ? "1px solid rgba(244,63,94,0.2)" : "1px solid transparent",
                }}
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
          {/* Salon Profile */}
          {activeSection === "profile" && (
            <div className="glass-card p-6 space-y-6">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Salon Profile</h2>

              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", boxShadow: "0 4px 20px rgba(244,63,94,0.4)" }}>
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Salon Logo</p>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>PNG or JPG, max 2MB, recommended 200×200px</p>
                  <button className="btn-secondary text-xs px-4 py-2">Change Logo</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Salon Name", value: "Wyapar Beauty Studio", placeholder: "Enter salon name" },
                  { label: "Owner Name", value: "Admin User", placeholder: "Enter owner name" },
                  { label: "Email Address", value: "admin@wyapar.com", placeholder: "Enter email" },
                  { label: "Phone Number", value: "+91 98765 43210", placeholder: "Enter phone" },
                  { label: "GST Number", value: "27AAAAA0000A1Z5", placeholder: "Enter GST number" },
                  { label: "Website", value: "wyapar.com", placeholder: "Enter website URL" },
                ].map((field, i) => (
                  <div key={i}>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{field.label}</label>
                    <input type="text" defaultValue={field.value} placeholder={field.placeholder} className="input-field" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Salon Address</label>
                <textarea rows={3} defaultValue="123 Beauty Lane, Bandra West, Mumbai - 400050, Maharashtra" className="input-field resize-none" />
              </div>

              <div className="flex justify-end gap-3">
                <button className="btn-secondary">Cancel</button>
                <button className="btn-primary"><Save className="w-4 h-4" />Save Changes</button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "bookingConfirm", label: "Booking Confirmations", desc: "Get notified when a booking is confirmed" },
                  { key: "bookingReminder", label: "Appointment Reminders", desc: "Reminders 24h before appointments" },
                  { key: "lowStock", label: "Low Stock Alerts", desc: "Alert when product stock falls below threshold" },
                  { key: "newClient", label: "New Client Registration", desc: "Notify when a new client registers" },
                  { key: "dailyReport", label: "Daily Revenue Report", desc: "End-of-day revenue summary" },
                  { key: "smsAlerts", label: "SMS Alerts", desc: "Receive critical alerts via SMS" },
                ].map((notif) => (
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
                      onClick={() => toggleNotif(notif.key as keyof typeof notifications)}
                      className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all"
                      style={{
                        background: notifications[notif.key as keyof typeof notifications]
                          ? "linear-gradient(135deg, #f43f5e, #e11d48)"
                          : "rgba(255,255,255,0.1)",
                        boxShadow: notifications[notif.key as keyof typeof notifications] ? "0 0 12px rgba(244,63,94,0.4)" : "none",
                      }}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: notifications[notif.key as keyof typeof notifications] ? "28px" : "4px" }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Hours */}
          {activeSection === "hours" && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Business Hours</h2>
              <div className="space-y-3">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button
                      onClick={() => toggleHourDay(i)}
                      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all"
                      style={{
                        background: h.open ? "linear-gradient(135deg, #f43f5e, #e11d48)" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: h.open ? "22px" : "2px" }} />
                    </button>
                    <span className="w-24 text-sm font-medium flex-shrink-0" style={{ color: h.open ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {h.day}
                    </span>
                    {h.open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" defaultValue={h.from} className="input-field py-1.5 text-xs" style={{ width: "110px" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
                        <input type="time" defaultValue={h.to} className="input-field py-1.5 text-xs" style={{ width: "110px" }} />
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Closed</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button className="btn-primary"><Save className="w-4 h-4" />Save Hours</button>
              </div>
            </div>
          )}

          {/* Staff */}
          {activeSection === "staff" && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Staff & Roles</h2>
                <button className="btn-primary text-xs px-4 py-2"><User className="w-3.5 h-3.5" />Add Staff</button>
              </div>
              <div className="space-y-3">
                {staffList.map((staff, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${staff.color}20`, color: staff.color }}>
                      {staff.name[0]}{staff.name.split(" ")[1]?.[0] || ""}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{staff.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{staff.role}</p>
                    </div>
                    <span className={staff.status === "active" ? "badge-success" : "badge-warning"}>
                      {staff.status === "active" ? "Active" : "On Leave"}
                    </span>
                    <button className="btn-secondary text-xs px-3 py-2">Edit</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing */}
          {activeSection === "billing" && (
            <div className="space-y-4">
              <div className="glass-card p-6" style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(168,85,247,0.08) 100%)", border: "1px solid rgba(244,63,94,0.2)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span className="text-sm font-bold text-gradient-gold">Pro Plan — Active</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹2,999<span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>/month</span></p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next billing date: June 19, 2026</p>
                  </div>
                  <button className="btn-gold text-xs">Upgrade to Enterprise</button>
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
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>•••• •••• •••• 4242</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Expires 08/2027</p>
                  </div>
                  <button className="ml-auto btn-secondary text-xs px-3 py-2">Update</button>
                </div>
              </div>
            </div>
          )}

          {/* Default for other sections */}
          {!["profile", "notifications", "hours", "staff", "billing"].includes(activeSection) && (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
              <Settings className="w-12 h-12 mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
              <p className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {settingsSections.find(s => s.id === activeSection)?.label}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>This section is coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
