"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  LogOut,
  User,
} from "lucide-react";
import { clsx } from "clsx";

interface UserSession {
  userId: string;
  email: string;
  name: string;
  roleType: "staff" | "client";
  staffRole?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [salonName, setSalonName] = useState("Wyapar Beauty Studio");
  const [logoUrl, setLogoUrl] = useState("");

  const fetchSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSalonName(data.data.salon_name || "Wyapar Beauty Studio");
          setLogoUrl(data.data.logo_url || "");
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        }
      })
      .catch(() => {});

    fetchSettings();
    window.addEventListener("settings-updated", fetchSettings);
    return () => window.removeEventListener("settings-updated", fetchSettings);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  // Define nav links depending on role
  const isClient = user?.roleType === "client";
  const isAdmin = user?.roleType === "staff" && user?.staffRole === "ADMIN";

  const getNavGroups = () => {
    if (isClient) {
      return [
        {
          label: "Customer Portal",
          items: [
            { label: "Dashboard", href: "/portal", icon: LayoutDashboard, badge: null },
            { label: "Book Services", href: "/portal/services", icon: Scissors, badge: null },
            { label: "My Bookings", href: "/portal/bookings", icon: CalendarDays, badge: null },
          ],
        },
      ];
    }

    // Staff navigation
    return [
      {
        label: "Overview",
        items: [
          { label: "Dashboard", href: "/", icon: LayoutDashboard, badge: null },
          ...(isAdmin ? [{ label: "Analytics", href: "/analytics", icon: BarChart3, badge: null }] : []),
        ],
      },
      {
        label: "Salon",
        items: [
          { label: "Products", href: "/products", icon: Package, badge: null },
          { label: "Services", href: "/services", icon: Scissors, badge: null },
          { label: "Appointments", href: "/appointments", icon: CalendarDays, badge: null },
        ],
      },
      {
        label: "Business",
        items: [
          { label: "Clients", href: "/clients", icon: Users, badge: null },
          { label: "Point of Sale", href: "/pos", icon: ShoppingCart, badge: null },
        ],
      },
    ];
  };

  const navGroups = getNavGroups();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

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
        <Link href={isClient ? "/portal" : "/"} className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: logoUrl ? "none" : "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              boxShadow: logoUrl ? "none" : "0 4px 14px rgba(244,63,94,0.4)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
            )}
          </div>
          <div>
            <p
              className="text-base font-bold tracking-tight leading-none"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
            >
              {salonName.split(" ")[0]}
            </p>
            <p
              className="text-[10px] font-medium tracking-widest uppercase mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {salonName.split(" ").slice(1).join(" ") || "Beauty Studio"}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Status chip ──────────────── */}
      {!isClient && (
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
      )}

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
        {isAdmin && (
          <Link
            href="/settings"
            className={clsx("nav-link", { active: pathname === "/settings" })}
          >
            <Settings
              style={{
                width: "16px",
                height: "16px",
                flexShrink: 0,
                color: pathname === "/settings" ? "var(--accent-rose-light)" : "var(--text-muted)",
              }}
            />
            <span className="flex-1 text-sm">Settings</span>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="nav-link w-full text-left"
          style={{ background: "transparent", border: "none" }}
        >
          <LogOut
            style={{
              width: "16px",
              height: "16px",
              flexShrink: 0,
              color: "var(--text-muted)",
            }}
          />
          <span className="flex-1 text-sm">Sign Out</span>
        </button>

        {/* Profile */}
        <div
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl mt-1 cursor-pointer transition-all"
          style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", marginTop: "8px" }}
        >
          <div
            className="avatar text-xs flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
              width: "34px",
              height: "34px",
              boxShadow: "0 0 10px rgba(244,63,94,0.25)",
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {user?.name || "Loading..."}
            </p>
            <p className="text-[10px] truncate uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
              {isClient ? "Customer" : user?.staffRole || "Staff"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
