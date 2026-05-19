"use client";

import { Bell, Search, Plus, Sun } from "lucide-react";

export default function Topbar() {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 flex-shrink-0 relative z-10"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(13,6,8,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search clients, products, services..."
            className="input-field pl-10 pr-4 py-2.5 text-sm"
            style={{ paddingTop: "10px", paddingBottom: "10px" }}
          />
        </div>
        <kbd
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-muted)",
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* New Booking CTA */}
        <button className="btn-primary hidden sm:flex">
          <Plus className="w-4 h-4" />
          New Booking
        </button>

        {/* Notifications */}
        <button
          className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/[0.06]"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Bell className="w-4.5 h-4.5" style={{ width: "18px", height: "18px", color: "var(--text-secondary)" }} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "#f43f5e", boxShadow: "0 0 6px rgba(244,63,94,0.8)" }}
          />
        </button>

        {/* Avatar */}
        <div
          className="avatar cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
            boxShadow: "0 0 12px rgba(244,63,94,0.3)",
          }}
        >
          SA
        </div>
      </div>
    </header>
  );
}
