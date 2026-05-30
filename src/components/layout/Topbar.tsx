"use client";

import { Bell, Search, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useBooking } from "@/context/BookingContext";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface UserSession {
  userId: string;
  email: string;
  name: string;
  roleType: "staff" | "client";
  staffRole?: string;
}

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { openBooking } = useBooking();
  const [user, setUser] = useState<UserSession | null>(null);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    clients: any[];
    products: any[];
    services: any[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search input fetching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    const delay = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setSearchLoading(false);
        });
    }, 300); // 300ms debounce

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchDropdown(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch real-time notifications from database
  useEffect(() => {
    if (!user || user.roleType === "client") return;

    function fetchNotifications() {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setActiveNotifications((prev) => {
              const isDifferent = JSON.stringify(prev) !== JSON.stringify(data.data);
              if (isDifferent) {
                setUnreadCount(data.data.length);
              }
              return data.data;
            });
          }
        })
        .catch(() => {});
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close notifications popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isClient = user?.roleType === "client";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <header
      className="flex items-center gap-4 px-6 py-3.5 flex-shrink-0 relative z-[90]"
      style={{
        background: "var(--bg-topbar)",
        borderBottom: "1px solid var(--border-sidebar)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md" ref={searchContainerRef}>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search clients, products, services…"
          className="input-field pl-10 pr-10 py-2.5 text-sm w-full"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchDropdown(true);
          }}
          onFocus={() => setShowSearchDropdown(true)}
        />
        {searchQuery ? (
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults(null);
              setShowSearchDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold hover:text-[var(--text-primary)] transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Clear
          </button>
        ) : (
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium pointer-events-none"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-muted)",
            }}
          >
            ⌘K
          </kbd>
        )}

        <AnimatePresence>
          {showSearchDropdown && (searchQuery.trim().length > 0 || searchLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-2 rounded-2xl p-4 overflow-hidden z-[999] max-h-[300px] overflow-y-auto w-full text-left"
              style={{
                background: "var(--bg-dropdown)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-dropdown)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              {searchLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!searchLoading && (!searchResults || (searchResults.clients.length === 0 && searchResults.products.length === 0 && searchResults.services.length === 0)) && (
                <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {!searchLoading && searchResults && (
                <div className="space-y-4">
                  {/* Clients */}
                  {searchResults.clients.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                        Clients
                      </h4>
                      <div className="space-y-1">
                        {searchResults.clients.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setShowSearchDropdown(false);
                              setSearchQuery("");
                              router.push(`/clients?search=${encodeURIComponent(c.name)}`);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-xs transition-colors flex flex-col gap-0.5"
                          >
                            <span className="font-semibold text-[var(--text-primary)]">{c.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{c.phone || c.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                        Products
                      </h4>
                      <div className="space-y-1">
                        {searchResults.products.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setShowSearchDropdown(false);
                              setSearchQuery("");
                              router.push(`/products?search=${encodeURIComponent(p.name)}`);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-xs transition-colors flex flex-col gap-0.5"
                          >
                            <span className="font-semibold text-[var(--text-primary)]">{p.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {p.brand} · SKU: {p.sku} · ₹{Number(p.price).toLocaleString("en-IN")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {searchResults.services.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                        Services
                      </h4>
                      <div className="space-y-1">
                        {searchResults.services.map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setShowSearchDropdown(false);
                              setSearchQuery("");
                              router.push(`/services?search=${encodeURIComponent(s.name)}`);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-xs transition-colors flex flex-col gap-0.5"
                          >
                            <span className="font-semibold text-[var(--text-primary)]">{s.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {s.category} · ₹{Number(s.price).toLocaleString("en-IN")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Date chip */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>

        {/* New Booking - Hide for customers */}
        {!isClient && (
          <button className="btn-primary hidden sm:inline-flex" onClick={() => openBooking()}>
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        {/* Notifications - Hide for customers for simplicity */}
        {!isClient && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setUnreadCount(0); // clear red dot once opened
              }}
              className="btn-icon relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: "#f43f5e", boxShadow: "0 0 5px rgba(244,63,94,0.9)" }}
                />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl p-4 overflow-hidden z-[999]"
                  style={{
                    background: "var(--bg-dropdown)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-dropdown)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                      Notifications
                    </h3>
                    {activeNotifications.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveNotifications([]);
                          setUnreadCount(0);
                        }}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Dropdown Content */}
                  {activeNotifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                      No new notifications
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {activeNotifications.map((n) => (
                        <div key={n.id} className="flex gap-2.5 items-start text-xs leading-relaxed text-left">
                          <span className={`mt-1.5 ${n.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-secondary)] break-words">
                              {n.text}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                              {n.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "var(--border-default)" }} />

        {/* User Avatar */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl"
          style={{ border: "1px solid transparent" }}
        >
          <div
            className="avatar text-xs"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
              boxShadow: "0 0 10px rgba(244,63,94,0.3)",
              width: "32px",
              height: "32px",
            }}
          >
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {user?.name || "Loading..."}
            </p>
            <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
              {isClient ? "Customer" : user?.staffRole?.toLowerCase() || "Staff"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
