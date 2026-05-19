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
  Bell,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    badge: null,
  },
  {
    label: "Services",
    href: "/services",
    icon: Scissors,
    badge: null,
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    badge: "3",
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    badge: null,
  },
  {
    label: "Point of Sale",
    href: "/pos",
    icon: ShoppingCart,
    badge: null,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    badge: null,
  },
];

const bottomNavItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-full relative z-20 flex-shrink-0"
      style={{
        width: "var(--sidebar-width)",
        background:
          "linear-gradient(180deg, rgba(21,10,14,0.98) 0%, rgba(13,6,8,0.98) 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              boxShadow: "0 4px 15px rgba(244,63,94,0.4)",
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-playfair)",
                color: "var(--text-primary)",
              }}
            >
              Wyapar
            </p>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Beauty Studio
            </p>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-4 border-t border-white/[0.06]" />

      {/* Salon status */}
      <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="flex items-center gap-2">
          <div className="glow-dot-green" />
          <span className="text-xs font-medium text-emerald-400">Salon is Open</span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          Today: 9:00 AM – 8:00 PM
        </p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("nav-link", { active: isActive })}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: "18px", height: "18px" }} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(244,63,94,0.2)",
                    color: "#fb7185",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-0.5 border-t border-white/[0.06]">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("nav-link", { active: isActive })}
            >
              <Icon style={{ width: "18px", height: "18px" }} className="flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Profile */}
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl mt-2 cursor-pointer transition-all hover:bg-white/[0.04]"
        >
          <div
            className="avatar"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
            }}
          >
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              Salon Admin
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              admin@wyapar.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
