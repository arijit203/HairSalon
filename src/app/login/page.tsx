"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Mail, Sparkles, Scissors, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [roleType, setRoleType] = useState<"client" | "staff">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, roleType }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      // Success - redirect based on role
      router.refresh();
      if (roleType === "staff") {
        router.push(callbackUrl || "/");
      } else {
        router.push("/portal");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-[450px] relative">
        {/* Glow behind card */}
        <div
          className="absolute -inset-1 rounded-2xl opacity-30 blur-2xl transition duration-1000 group-hover:duration-200"
          style={{
            background: "linear-gradient(90deg, #f43f5e, #a855f7)",
          }}
        />

        {/* Card */}
        <div className="glass-card relative p-8 md:p-10 space-y-6">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-2">
              <Scissors className="w-6 h-6 animate-float" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
              Welcome to Madoe Beauty Salon
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Manage your bookings and experience salon excellence
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
            <button
              onClick={() => {
                setRoleType("client");
                setError(null);
              }}
              className="flex-1 py-2 text-xs font-semibold rounded-lg relative z-10 transition-colors"
              style={{ color: roleType === "client" ? "#fff" : "var(--text-muted)" }}
            >
              Customer Portal
            </button>
            <button
              onClick={() => {
                setRoleType("staff");
                setError(null);
              }}
              className="flex-1 py-2 text-xs font-semibold rounded-lg relative z-10 transition-colors"
              style={{ color: roleType === "staff" ? "#fff" : "var(--text-muted)" }}
            >
              Salon Staff
            </button>

            {/* Slider pill */}
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_2px_10px_rgba(244,63,94,0.3)]"
              layoutId="roleSlider"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{
                width: "calc(50% - 4px)",
                left: roleType === "client" ? "4px" : "calc(50% + 2px)",
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-400 font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                {roleType === "client" && (
                  <span className="text-[11px] text-rose-400 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 group font-semibold"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Log In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Register Prompt */}
          {roleType === "client" && (
            <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
              New client?{" "}
              <Link href="/register" className="text-rose-400 font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          )}

          {roleType === "staff" && (
            <div className="text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
              Contact your salon administrator for staff account setup and roles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
