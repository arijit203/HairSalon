import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";

// GET /api/dashboard/stats
export async function GET(_req: NextRequest) {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000);

    // This month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Last month boundaries
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      // Revenue
      thisMonthRevenue, lastMonthRevenue,
      // Bookings
      todayBookings, todayBookingsTotal,
      // Clients
      totalClients, newClientsThisMonth,
      // Products
      thisMonthProductsSold, lastMonthProductsSold,
      // Low stock
      lowStockCount,
      // Today's appointments
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
      // Today's booking count
      prisma.appointment.count({
        where: { date: { gte: todayStart, lt: todayEnd } },
      }),
      // Today's new bookings (created today)
      prisma.appointment.count({
        where: { createdAt: { gte: todayStart, lt: todayEnd } },
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
      // Low-stock products
      prisma.product.count({
        where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] }, isActive: true },
      }),
      // Today's appointments with details
      prisma.appointment.findMany({
        where: { date: { gte: todayStart, lt: todayEnd } },
        orderBy: { startTime: "asc" },
        include: {
          client:  { select: { id: true, name: true } },
          service: { select: { id: true, name: true, duration: true } },
          staff:   { select: { id: true, name: true } },
        },
      }),
    ]);

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
      },
      todayAppointments,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
