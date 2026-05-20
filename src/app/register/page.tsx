"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, User, Phone, Loader2, ArrowRight, Scissors } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      // Success - redirect to client portal
      router.refresh();
      router.push("/portal");
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
              Create Account
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sign up as a customer to schedule appointments, track loyalty rewards, and view services.
            </p>
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
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="input-field pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="input-field pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
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
                  Register <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Login Prompt */}
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="text-rose-400 font-semibold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
