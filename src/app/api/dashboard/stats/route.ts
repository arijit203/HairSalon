import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

// Cached wrapper for dashboard stats queries
const getCachedDashboardData = unstable_cache(
  async (
    todayStartStr: string,
    todayEndStr: string,
    monthStartStr: string,
    monthEndStr: string,
    lastMonthStartStr: string,
    lastMonthEndStr: string
  ) => {
    const todayStart = new Date(todayStartStr);
    const todayEnd   = new Date(todayEndStr);
    const monthStart = new Date(monthStartStr);
    const monthEnd   = new Date(monthEndStr);
    const lastMonthStart = new Date(lastMonthStartStr);
    const lastMonthEnd   = new Date(lastMonthEndStr);

    const [
      thisMonthRevenue, lastMonthRevenue,
      todayAppointmentsList, createdTodayAppointmentsList,
      totalClients, newClientsThisMonth,
      thisMonthProductsSold, lastMonthProductsSold,
      lowStockCount, outOfStockCount,
      todayAppointments,
    ] = await Promise.all([
      // Revenue this month
      prisma.transaction.aggregate({
        where:  { createdAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
        _sum:   { total: true },
      }),
      // Revenue last month
      prisma.transaction.aggregate({
        where:  { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: "COMPLETED" },
        _sum:   { total: true },
      }),
      // Today's appointments for grouping
      prisma.appointment.findMany({
        where: { date: { gte: todayStart, lt: todayEnd }, status: "COMPLETED" },
        select: { clientId: true, date: true, startTime: true, endTime: true },
      }),
      // Today's new appointments (created today) for grouping
      prisma.appointment.findMany({
        where: { createdAt: { gte: todayStart, lt: todayEnd }, status: "COMPLETED" },
        select: { clientId: true, date: true, startTime: true, endTime: true },
      }),
      // Total active clients
      prisma.client.count({ where: { isActive: true } }),
      // New clients this month
      prisma.client.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      // Products sold this month (sum of quantities in transaction items)
      prisma.transactionItem.aggregate({
        where: {
          productId:   { not: null },
          transaction: { createdAt: { gte: monthStart, lte: monthEnd } },
        },
        _sum: { quantity: true },
      }),
      // Products sold last month
      prisma.transactionItem.aggregate({
        where: {
          productId:   { not: null },
          transaction: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        },
        _sum: { quantity: true },
      }),
      // LOW_STOCK products
      prisma.product.count({
        where: { status: "LOW_STOCK", isActive: true },
      }),
      // OUT_OF_STOCK products
      prisma.product.count({
        where: { status: "OUT_OF_STOCK", isActive: true },
      }),
      // Today's appointments OR any future pending/scheduled appointments
      prisma.appointment.findMany({
        where: {
          OR: [
            { date: { gte: todayStart, lt: todayEnd } },
            {
              date: { gte: todayEnd },
              status: { in: ["PENDING", "COMPLETED", "IN_PROGRESS"] },
            }
          ]
        },
        orderBy: { createdAt: "desc" },
        include: {
          client:  { select: { id: true, name: true, phone: true, email: true } },
          service: { select: { id: true, name: true, price: true } },
          staff:   { select: { id: true, name: true } },
          transaction: {
            include: {
              items: true,
            }
          },
        },
      }),
    ]);

    return {
      thisMonthRevenue,
      lastMonthRevenue,
      todayAppointmentsList,
      createdTodayAppointmentsList,
      totalClients,
      newClientsThisMonth,
      thisMonthProductsSold,
      lastMonthProductsSold,
      lowStockCount,
      outOfStockCount,
      todayAppointments,
    };
  },
  ["dashboard-stats-v2"],
  {
    revalidate: 3600, // 1 hour cache time
    tags: ["dashboard-stats-v2"]
  }
);

// Helper to get current date parts in Asia/Kolkata timezone
function getKolkataDateParts() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const formatted = formatter.format(new Date());
  const [datePart, timePart] = formatted.split(", ");
  const [month, day, year] = datePart.split("/");
  
  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10) - 1, // 0-indexed
    day: parseInt(day, 10),
  };
}

// GET /api/dashboard/stats
export async function GET(_req: NextRequest) {
  try {
    const { year, month, day } = getKolkataDateParts();

    // Use UTC midnight dates to query @db.Date fields correctly
    const todayStart = new Date(Date.UTC(year, month, day));
    const todayEnd   = new Date(Date.UTC(year, month, day + 1));

    // This month boundaries in Asia/Kolkata local timezone
    const monthStart = new Date(`${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+05:30`);
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const monthEnd   = new Date(`${year}-${String(month + 1).padStart(2, "0")}-${lastDayOfMonth}T23:59:59+05:30`);

    // Last month boundaries in Asia/Kolkata local timezone
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 12 : month;
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    const lastMonthStart = new Date(`${prevYear}-${String(prevMonth).padStart(2, "0")}-01T00:00:00+05:30`);
    const lastMonthEnd   = new Date(`${prevYear}-${String(prevMonth).padStart(2, "0")}-${lastDayOfPrevMonth}T23:59:59+05:30`);

    const {
      thisMonthRevenue,
      lastMonthRevenue,
      todayAppointmentsList,
      createdTodayAppointmentsList,
      totalClients,
      newClientsThisMonth,
      thisMonthProductsSold,
      lastMonthProductsSold,
      lowStockCount,
      outOfStockCount,
      todayAppointments,
    } = await getCachedDashboardData(
      todayStart.toISOString(),
      todayEnd.toISOString(),
      monthStart.toISOString(),
      monthEnd.toISOString(),
      lastMonthStart.toISOString(),
      lastMonthEnd.toISOString()
    );

    const coerceDate = (d: any) => d instanceof Date ? d : new Date(d);

    const uniqueTodayBookingsMap = new Set(
      todayAppointmentsList.map(a => `${a.clientId}_${coerceDate(a.date).toISOString().split("T")[0]}_${a.startTime}_${a.endTime}`)
    );
    const todayBookings = uniqueTodayBookingsMap.size;

    const uniqueCreatedTodayMap = new Set(
      createdTodayAppointmentsList.map(a => `${a.clientId}_${coerceDate(a.date).toISOString().split("T")[0]}_${a.startTime}_${a.endTime}`)
    );
    const todayBookingsTotal = uniqueCreatedTodayMap.size;

    // Revenue change %
    const thisRev  = Number(thisMonthRevenue._sum.total ?? 0);
    const lastRev  = Number(lastMonthRevenue._sum.total ?? 0);
    const revChange = lastRev > 0
      ? (((thisRev - lastRev) / lastRev) * 100).toFixed(1)
      : "0.0";

    // Products sold change
    const thisSold  = thisMonthProductsSold._sum.quantity ?? 0;
    const lastSold  = lastMonthProductsSold._sum.quantity ?? 0;
    const soldChange = lastSold > 0
      ? (((thisSold - lastSold) / lastSold) * 100).toFixed(1)
      : "0.0";

    return successResponse({
      revenue: {
        thisMonth:  thisRev,
        lastMonth:  lastRev,
        changePercent: parseFloat(revChange),
      },
      bookings: {
        today:    todayBookings,
        newToday: todayBookingsTotal,
      },
      clients: {
        total:      totalClients,
        newThisMonth: newClientsThisMonth,
      },
      productsSold: {
        thisMonth: thisSold,
        lastMonth: lastSold,
        changePercent: parseFloat(soldChange),
      },
      alerts: {
        lowStockCount,
        outOfStockCount,
      },
      todayAppointments,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

