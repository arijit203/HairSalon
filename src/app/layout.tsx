import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ui/Toast";
import { SidebarProvider } from "@/context/SidebarContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Wyapar — Beauty Salon Management",
  description:
    "Professional beauty salon management platform for products, services, bookings, and analytics.",
  keywords: "beauty salon, salon management, products, services, bookings",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <SidebarProvider>
              {/* Ambient background glows */}
              <div className="ambient-glow ambient-glow-1" />
              <div className="ambient-glow ambient-glow-2" />

              <AppLayout>{children}</AppLayout>

              <ToastContainer />
            </SidebarProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
