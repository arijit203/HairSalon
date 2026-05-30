import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function getKolkataTimeStr(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value ?? "00";
  const minute = parts.find(p => p.type === 'minute')?.value ?? "00";
  const normHour = hour === "24" ? "00" : hour;
  return `${normHour}:${minute}`;
}

// Cached wrapper for analytics data queries and grouping
const getCachedAnalytics = unstable_cache(
  async (fromStr: string, toStr: string, period: string) => {
    const from = new Date(fromStr);
    const to   = new Date(toStr);

    const periodDiff = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodDiff);
    const prevTo = new Date(from.getTime() - 1);

    // ── 1. Fetch current and previous period data in parallel
    const [
      transactions, expenses, appointments, totalClients, retainedClients,
      prevTransactions, prevExpenses, prevClients, prevRetainedClients,
      txItems, prevTxItems
    ] = await Promise.all([
      // Current Period
      prisma.transaction.findMany({
        where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
        select: { total: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        select: { amount: true, date: true },
      }),
      prisma.appointment.findMany({
        where: { date: { gte: from, lte: to }, status: "COMPLETED" },
        include: {
          client: { select: { email: true } },
        },
      }),
      prisma.client.count({ where: { isActive: true } }),
      prisma.client.count({
        where: { isActive: true, totalVisits: { gte: 2 } },
      }),
      // Previous Period
      prisma.transaction.findMany({
        where: { createdAt: { gte: prevFrom, lte: prevTo }, status: "COMPLETED" },
        select: { total: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: prevFrom, lte: prevTo } },
        select: { amount: true },
      }),
      prisma.client.count({
        where: { isActive: true, createdAt: { lt: from } },
      }),
      prisma.client.count({
        where: { isActive: true, createdAt: { lt: from }, totalVisits: { gte: 2 } },
      }),
      // Service revenue items
      prisma.transactionItem.findMany({
        where: {
          transaction: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
        },
        include: {
          service: { select: { category: true } },
        },
      }),
      prisma.transactionItem.findMany({
        where: {
          transaction: { createdAt: { gte: prevFrom, lte: prevTo }, status: "COMPLETED" },
        },
        include: {
          service: { select: { category: true } },
        },
      }),
    ]);

    // ── 2. Calculate KPIs and comparisons
    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const avgTicketSize = transactions.length > 0 ? totalRevenue / transactions.length : 0;
    const retentionRate = totalClients > 0 ? (retainedClients / totalClients) * 100 : 0;

    const prevRevenue = prevTransactions.reduce((sum, t) => sum + Number(t.total), 0);
    const prevExpensesSum = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const prevProfit = prevRevenue - prevExpensesSum;
    const prevProfitMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;
    const prevAvgTicketSize = prevTransactions.length > 0 ? prevRevenue / prevTransactions.length : 0;
    const prevRetentionRate = prevClients > 0 ? (prevRetainedClients / prevClients) * 100 : 0;

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const marginChange = profitMargin - prevProfitMargin; // Margin diff in percentage points
    const ticketChange = prevAvgTicketSize > 0 ? ((avgTicketSize - prevAvgTicketSize) / prevAvgTicketSize) * 100 : 0;
    const retentionChange = retentionRate - prevRetentionRate; // Retention diff in percentage points

    // ── 3. Revenue vs Expenses Timeline
    const groupMap = new Map<string, { revenue: number; expenses: number }>();

    if (period === "1D") {
      groupMap.set("09:00", { revenue: 0, expenses: 0 });
      for (const t of transactions) {
        const label = getKolkataTimeStr(new Date(t.createdAt));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue + Number(t.total), expenses: val.expenses });
      }
      for (const e of expenses) {
        const label = getKolkataTimeStr(new Date(e.date));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue, expenses: val.expenses + Number(e.amount) });
      }
      if (!groupMap.has("21:00")) {
        groupMap.set("21:00", { revenue: 0, expenses: 0 });
      }
      const sortedEntries = Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      groupMap.clear();
      for (const [k, v] of sortedEntries) {
        groupMap.set(k, v);
      }
    } else if (period === "7D" || period === "1M") {
      const dayFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
      });
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(dayFormat.format(temp), { revenue: 0, expenses: 0 });
        temp.setDate(temp.getDate() + 1);
      }
      for (const t of transactions) {
        const label = dayFormat.format(new Date(t.createdAt));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue + Number(t.total), expenses: val.expenses });
      }
      for (const e of expenses) {
        const label = dayFormat.format(new Date(e.date));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue, expenses: val.expenses + Number(e.amount) });
      }
    } else {
      const monthFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
      });
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(monthFormat.format(temp), { revenue: 0, expenses: 0 });
        temp.setMonth(temp.getMonth() + 1);
      }
      for (const t of transactions) {
        const label = monthFormat.format(new Date(t.createdAt));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue + Number(t.total), expenses: val.expenses });
      }
      for (const e of expenses) {
        const label = monthFormat.format(new Date(e.date));
        const val = groupMap.get(label) || { revenue: 0, expenses: 0 };
        groupMap.set(label, { revenue: val.revenue, expenses: val.expenses + Number(e.amount) });
      }
    }

    const revenueData = Array.from(groupMap.entries()).map(([label, val]) => ({
      month: label,
      revenue: Math.round(val.revenue),
      expenses: Math.round(val.expenses),
      profit: Math.round(val.revenue - val.expenses),
    }));

    // ── 4. Weekly Bookings
    const weeklyBookingsMap = new Map<string, { bookings: number; walkins: number }>();
    const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const day of DAYS_ORDER) {
      weeklyBookingsMap.set(day, { bookings: 0, walkins: 0 });
    }
    for (const appt of appointments) {
      const dayIndex = new Date(appt.date).getUTCDay();
      const dayName = DAYS_SHORT[dayIndex];
      const stats = weeklyBookingsMap.get(dayName) || { bookings: 0, walkins: 0 };
      const isWalkin = appt.client?.email?.startsWith("walkin_") ?? false;
      if (isWalkin) {
        stats.walkins += 1;
      } else {
        stats.bookings += 1;
      }
      weeklyBookingsMap.set(dayName, stats);
    }
    const weeklyData = DAYS_ORDER.map(day => ({
      day,
      bookings: weeklyBookingsMap.get(day)?.bookings ?? 0,
      walkins: weeklyBookingsMap.get(day)?.walkins ?? 0,
    }));

    // ── 5. Service/Retail Revenue Breakdown
    const categoryRevenueMap = new Map<string, number>();
    for (const item of txItems) {
      const category = item.service?.category ?? (item.productId ? "Retail" : "Other");
      categoryRevenueMap.set(category, (categoryRevenueMap.get(category) ?? 0) + Number(item.lineTotal));
    }
    const prevCategoryRevenueMap = new Map<string, number>();
    for (const item of prevTxItems) {
      const category = item.service?.category ?? (item.productId ? "Retail" : "Other");
      prevCategoryRevenueMap.set(category, (prevCategoryRevenueMap.get(category) ?? 0) + Number(item.lineTotal));
    }
    const serviceRevenue = Array.from(categoryRevenueMap.entries())
      .map(([name, revenue]) => {
        const prevRevenue = prevCategoryRevenueMap.get(name) ?? 0;
        const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
        return {
          name,
          revenue,
          growth: parseFloat(growth.toFixed(1)),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // ── 6. Staff Performance
    const staffPerformance = await prisma.appointment.groupBy({
      by:    ["staffId"],
      where: {
        date:   { gte: from, lte: to },
        status: { in: ["COMPLETED"] },
      },
      _count: { id: true },
      _sum:   { price: true },
    });
    const staffIds = staffPerformance.map((s) => s.staffId);
    const staffList = await prisma.staff.findMany({
      where:  { id: { in: staffIds } },
      select: { id: true, name: true, role: true },
    });
    const staffMap = new Map(staffList.map((s) => [s.id, s]));
    const staffStats = staffPerformance
      .map((s) => ({
        name:     staffMap.get(s.staffId)?.name     ?? "Unknown",
        role:     staffMap.get(s.staffId)?.role     ?? "STYLIST",
        bookings: s._count.id,
        revenue:  Number(s._sum.price ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      revenueData,
      serviceRevenue,
      staffStats,
      weeklyData,
      kpis: [
        { label: "Total Revenue (Period)", value: `₹${totalRevenue.toLocaleString("en-IN")}`, change: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`, up: revenueChange >= 0 },
        { label: "Net Profit Margin", value: `${profitMargin.toFixed(1)}%`, change: `${marginChange >= 0 ? "+" : ""}${marginChange.toFixed(1)}%`, up: marginChange >= 0 },
        { label: "Customer Retention", value: `${retentionRate.toFixed(0)}%`, change: `${retentionChange >= 0 ? "+" : ""}${retentionChange.toFixed(1)}%`, up: retentionChange >= 0 },
        { label: "Avg. Ticket Size", value: `₹${Math.round(avgTicketSize).toLocaleString("en-IN")}`, change: `${ticketChange >= 0 ? "+" : ""}${ticketChange.toFixed(1)}%`, up: ticketChange >= 0 }
      ]
    };
  },
  ["analytics-data"],
  {
    revalidate: 3600, // 1 hour cache time
    tags: ["analytics"]
  }
);

// GET /api/analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const to   = new Date(searchParams.get("to")   ?? new Date());
    const from = new Date(searchParams.get("from") ?? new Date(to.getFullYear(), to.getMonth() - 5, 1));
    const period = searchParams.get("period") ?? "6M";

    const data = await getCachedAnalytics(
      from.toISOString(),
      to.toISOString(),
      period
    );

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
