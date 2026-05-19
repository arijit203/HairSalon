"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Scissors,
  CalendarDays,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",  href: "/",            icon: LayoutDashboard, badge: null },
      { label: "Analytics",  href: "/analytics",   icon: BarChart3,       badge: null },
    ],
  },
  {
    label: "Salon",
    items: [
      { label: "Products",     href: "/products",     icon: Package,      badge: null },
      { label: "Services",     href: "/services",     icon: Scissors,     badge: null },
      { label: "Appointments", href: "/appointments", icon: CalendarDays, badge: "3" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Clients",      href: "/clients",  icon: Users,        badge: null },
      { label: "Point of Sale",href: "/pos",      icon: ShoppingCart, badge: null },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-sidebar)",
        zIndex: 20,
      }}
    >
      {/* ── Logo ─────────────────────── */}
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              boxShadow: "0 4px 14px rgba(244,63,94,0.4)",
            }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
          </div>
          <div>
            <p
              className="text-base font-bold tracking-tight leading-none"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
            >
              Wyapar
            </p>
            <p
              className="text-[10px] font-medium tracking-widest uppercase mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Beauty Studio
            </p>
          </div>
        </Link>
      </div>

      {/* ── Status chip ──────────────── */}
      <div className="mx-3 mb-4">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <div className="glow-dot-green" />
          <div>
            <p className="text-xs font-semibold text-emerald-500">Open Now</p>
            <p className="text-[10px] mt-0" style={{ color: "var(--text-muted)" }}>
              Closes at 8:00 PM
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────── */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest px-3.5 mb-1.5"
              style={{ color: "var(--text-disabled)" }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx("nav-link", { active })}
                  >
                    <Icon
                      style={{
                        width: "16px",
                        height: "16px",
                        flexShrink: 0,
                        color: active ? "var(--accent-rose-light)" : "var(--text-muted)",
                      }}
                    />
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(244,63,94,0.18)",
                          color: "var(--accent-rose-light)",
                          minWidth: "18px",
                          textAlign: "center",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <ChevronRight
                        style={{ width: "12px", height: "12px", color: "var(--accent-rose-light)", opacity: 0.7 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom ───────────────────── */}
      <div className="p-3 space-y-0.5" style={{ borderTop: "1px solid var(--border-sidebar)" }}>
        <Link
          href="/settings"
          className={clsx("nav-link", { active: pathname === "/settings" })}
        >
          <Settings
            style={{
              width: "16px", height: "16px", flexShrink: 0,
              color: pathname === "/settings" ? "var(--accent-rose-light)" : "var(--text-muted)",
            }}
          />
          <span className="flex-1 text-sm">Settings</span>
        </Link>

        {/* Profile */}
        <div
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl mt-1 cursor-pointer transition-all"
          style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", marginTop: "8px" }}
        >
          <div
            className="avatar text-xs flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
              width: "34px", height: "34px",
              boxShadow: "0 0 10px rgba(244,63,94,0.25)",
            }}
          >
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              Salon Admin
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              admin@wyapar.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
