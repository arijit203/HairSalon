import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  salon_name: "Madoe Beauty Salon",
  owner_name: "Admin User",
  email: "admin@wyapar.com",
  phone: "+91 98765 43210",
  gst_number: "27AAAAA0000A1Z5",
  website: "wyapar.com",
  address: "123 Beauty Lane, Bandra West, Mumbai - 400050, Maharashtra",
  logo_url: "",
  notification_bookingConfirm: "true",
  notification_bookingReminder: "true",
  notification_lowStock: "true",
  notification_newClient: "false",
  notification_dailyReport: "true",
  notification_smsAlerts: "false",
  business_hours: JSON.stringify([
    { day: "Monday", open: true, from: "09:00", to: "20:00" },
    { day: "Tuesday", open: true, from: "09:00", to: "20:00" },
    { day: "Wednesday", open: true, from: "09:00", to: "20:00" },
    { day: "Thursday", open: true, from: "09:00", to: "21:00" },
    { day: "Friday", open: true, from: "09:00", to: "21:00" },
    { day: "Saturday", open: true, from: "08:00", to: "22:00" },
    { day: "Sunday", open: false, from: "10:00", to: "18:00" }
  ]),
  subscription_plan: "Pro",
  card_number: "•••• •••• •••• 4242",
  card_expiry: "08/2027",
  theme_mode: "light",
  accent_color: "rose",
  integration_whatsapp: "false",
  integration_sms: "false",
  integration_custom_domain: "false"
};

// GET /api/settings
export async function GET() {
  try {
    const settingsList = await prisma.salonSettings.findMany();
    const settingsMap: Record<string, string> = {};

    // Populate from DB
    for (const item of settingsList) {
      settingsMap[item.key] = item.value;
    }

    // Merge with defaults for missing keys
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settingsMap };

    const response = successResponse(mergedSettings);
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const queries = [];
    for (const [key, value] of Object.entries(body)) {
      queries.push(
        prisma.salonSettings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        })
      );
    }

    await prisma.$transaction(queries);

    // Revalidate cached analytics & dashboard stats
    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Settings saved successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
