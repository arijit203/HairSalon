"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode, Suspense } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/invoice-upload/");

  if (isAuthPage) {
    return (
      <main className="flex-1 overflow-y-auto relative z-10 min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <Suspense fallback={<div style={{ width: "var(--sidebar-width)", background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-sidebar)" }} />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
