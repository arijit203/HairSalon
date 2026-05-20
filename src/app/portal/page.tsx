"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Scissors,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  loyaltyPoints: number;
  totalSpent: string | number;
  totalVisits: number;
  appointments: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    price: string | number;
    service: {
      name: string;
    };
    staff: {
      name: string;
    };
  }>;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientDetail | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const sessionRes = await fetch("/api/auth/me");
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok || !sessionData.success) {
          router.push("/login");
          return;
        }

        const clientId = sessionData.data.userId;
        const clientRes = await fetch(`/api/clients/${clientId}`);
        const clientDataJson = await clientRes.json();

        if (clientRes.ok && clientDataJson.success) {
          setClientData(clientDataJson.data);
        }
      } catch (err) {
        console.error("Error loading portal data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-8 text-center glass-card max-w-md mx-auto my-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Failed to load profile
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          We could not load your profile details. Please try logging out and logging back in.
        </p>
        <button
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"));
          }}
          className="btn-primary"
        >
          Sign In Again
        </button>
      </div>
    );
  }

  // Calculate progress to next tier
  const points = clientData.loyaltyPoints;
  let nextTier = "SILVER";
  let pointsNeeded = 500 - points;
  let progressPct = Math.min((points / 500) * 100, 100);
  let tierColorClass = "text-orange-400";
  let tierBgClass = "bg-orange-500/10 border-orange-500/25";

  if (clientData.tier === "SILVER") {
    nextTier = "GOLD";
    pointsNeeded = 1500 - points;
    progressPct = Math.min(((points - 500) / 1000) * 100, 100);
    tierColorClass = "text-slate-300";
    tierBgClass = "bg-slate-300/10 border-slate-300/25";
  } else if (clientData.tier === "GOLD") {
    nextTier = "PLATINUM";
    pointsNeeded = 3000 - points;
    progressPct = Math.min(((points - 1500) / 1500) * 100, 100);
    tierColorClass = "text-amber-400";
    tierBgClass = "bg-amber-400/10 border-amber-400/25";
  } else if (clientData.tier === "PLATINUM") {
    nextTier = "MAXED";
    pointsNeeded = 0;
    progressPct = 100;
    tierColorClass = "text-rose-400";
    tierBgClass = "bg-rose-500/10 border-rose-500/25";
  }

  const upcomingBookings = clientData.appointments.filter(
    (app) => app.status !== "CANCELLED" && app.status !== "NO_SHOW" && new Date(app.date) >= new Date(new Date().setHours(0,0,0,0))
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-white/[0.06] bg-gradient-to-r from-zinc-900 to-zinc-950">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/15">
              <Sparkles className="w-3.5 h-3.5" />
              Premium Salon Member
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              Hello, {clientData.name}!
            </h1>
            <p className="text-zinc-400 text-sm max-w-lg">
              Welcome back to your portal. Book styling appointments, browse services, and track your membership status.
            </p>
          </div>

          <Link href="/portal/services" className="btn-primary self-start md:self-auto py-3 px-5 flex items-center gap-2 group font-semibold shrink-0">
            Book Appointment
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Grid: Loyalty & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loyalty Tier Progress */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Membership Status
              </p>
              <h2 className="text-lg font-bold text-white mt-1">Loyalty Rewards</h2>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-sm font-extrabold ${tierColorClass} ${tierBgClass}`}>
              {clientData.tier} TIER
            </div>
          </div>

          <div className="space-y-2 py-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-4xl font-extrabold text-white">{points}</span>
                <span className="text-xs text-zinc-400 ml-1">points accumulated</span>
              </div>
              {nextTier !== "MAXED" && (
                <span className="text-xs font-medium text-zinc-400">
                  {pointsNeeded} points to {nextTier}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Earn 1 point for every ₹100 spent. Redeem points on popular services.</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Visits */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Visits</p>
              <p className="text-2xl font-extrabold text-white mt-1">{clientData.totalVisits}</p>
            </div>
          </div>

          {/* Spent */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Spent</p>
              <p className="text-2xl font-extrabold text-white mt-1">
                ₹{Number(clientData.totalSpent).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Upcoming Appointments</h2>

        {upcomingBookings.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No active appointments scheduled</p>
            <p className="text-xs text-zinc-500 mt-1 mb-4">You have no upcoming bookings right now.</p>
            <Link href="/portal/services" className="btn-secondary py-2.5 px-4 text-xs font-semibold inline-flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" /> Book Your First Service
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex justify-between items-start hover:border-white/[0.12] transition-colors"
              >
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-white">{booking.service.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Stylist: {booking.staff.name}</p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-400" />
                      {new Date(booking.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                    style={{
                      background:
                        booking.status === "CONFIRMED"
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(245,158,11,0.12)",
                      color:
                        booking.status === "CONFIRMED"
                          ? "#10b981"
                          : "#f59e0b",
                    }}
                  >
                    {booking.status}
                  </span>
                  <p className="text-base font-extrabold text-white">
                    ₹{Number(booking.price).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
