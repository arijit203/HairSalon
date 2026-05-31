"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebar } from "@/context/SidebarContext";

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
  const searchParams = useSearchParams();
  const { isOpen, close } = useSidebar();
  const [user, setUser] = useState<UserSession | null>(null);
  const [salonName, setSalonName] = useState("Madoe Beauty Salon");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState({
    isOpen: true,
    title: "Open Now",
    subtitle: "Closes at 9:00 PM",
  });

  const fetchSettings = () => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSalonName(data.data.salon_name || "Madoe Beauty Salon");
          setLogoUrl(data.data.logo_url || "");
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
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

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const openMinutes = 9 * 60; // 9:00 AM
      const closeMinutes = 21 * 60; // 9:00 PM

      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        setStatus({
          isOpen: true,
          title: "Open Now",
          subtitle: "Closes at 9:00 PM",
        });
      } else {
        const subtitle = currentMinutes < openMinutes
          ? "Opens today at 9:00 AM"
          : "Opening tomorrow at 9:00 AM";
        setStatus({
          isOpen: false,
          title: "Closed",
          subtitle: subtitle,
        });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
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
          { label: "Purchase & Expense", href: "/expenses", icon: ShoppingCart, badge: null },
          { label: "Clients & Staff", href: "/clients", icon: Users, badge: null },
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
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[95] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={close}
        />
      )}

      <aside
        className={clsx(
          "flex flex-col h-full flex-shrink-0 transition-transform duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-[100] lg:static lg:translate-x-0 lg:z-20",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
      >
        {/* ── Logo ─────────────────────── */}
        <div className="px-5 py-5">
          <Link href={isClient ? "/portal" : "/"} className="flex items-center gap-3" onClick={close}>
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
              background: status.isOpen ? "rgba(16,185,129,0.07)" : "rgba(244,63,94,0.07)",
              border: status.isOpen ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(244,63,94,0.15)",
            }}
          >
            <div className={status.isOpen ? "glow-dot-green" : "glow-dot-rose"} />
            <div>
              <p className={clsx("text-xs font-semibold", status.isOpen ? "text-emerald-500" : "text-rose-500")}>
                {status.isOpen ? "Open Now" : "Shop Closed"}
              </p>
              <p className="text-[10px] mt-0" style={{ color: "var(--text-muted)" }}>
                {status.subtitle}
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
              {group.items.map((item: any) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx("nav-link", { active })}
                    onClick={close}
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
            onClick={close}
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
          onClick={() => {
            close();
            handleLogout();
          }}
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
  </>
  );
}
