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
    const to = new Date(toStr);

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
        select: { id: true, total: true, discountAmt: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        select: { amount: true, date: true, category: true },
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
          transaction: { select: { createdAt: true } },
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
    const profitChange = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;
    const expensesChange = prevExpensesSum > 0 ? ((totalExpenses - prevExpensesSum) / prevExpensesSum) * 100 : 0;
    const retentionChange = retentionRate - prevRetentionRate; // Retention diff in percentage points

    // ── 3. Revenue vs Expenses Timeline
    const groupMap = new Map<string, {
      revenue: number; expenses: number; discount: number;
      incomeService: number; incomeProduct: number;
      expProduct: number; expStaff: number; expMisc: number;
    }>();

    const emptyGroup = () => ({
      revenue: 0, expenses: 0, discount: 0,
      incomeService: 0, incomeProduct: 0,
      expProduct: 0, expStaff: 0, expMisc: 0
    });

    if (period === "1D") {
      groupMap.set("09:00", emptyGroup());
      for (const t of transactions) {
        const label = getKolkataTimeStr(new Date(t.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        groupMap.set(label, { ...val, revenue: val.revenue + Number(t.total), discount: val.discount + Number(t.discountAmt) });
      }
      for (const e of expenses) {
        const label = getKolkataTimeStr(new Date(e.date));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(e.amount);
        val.expenses += amt;
        if (e.category === "PRODUCT_PURCHASE") val.expProduct += amt;
        else if (e.category === "STAFF_PAYMENT") val.expStaff += amt;
        else val.expMisc += amt;
        groupMap.set(label, val);
      }
      for (const item of txItems) {
        const label = getKolkataTimeStr(new Date(item.transaction.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(item.lineTotal);
        if (item.productId) val.incomeProduct += amt;
        else val.incomeService += amt;
        groupMap.set(label, val);
      }
      if (!groupMap.has("21:30")) {
        groupMap.set("21:30", emptyGroup());
      }
      const sortedEntries = Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      groupMap.clear();
      for (const [k, v] of sortedEntries) {
        if (k >= "09:00" && k <= "21:30") {
          groupMap.set(k, v);
        }
      }
    } else if (period === "7D" || period === "1M") {
      const dayFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
      });
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(dayFormat.format(temp), emptyGroup());
        temp.setDate(temp.getDate() + 1);
      }
      for (const t of transactions) {
        const label = dayFormat.format(new Date(t.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        groupMap.set(label, { ...val, revenue: val.revenue + Number(t.total), discount: val.discount + Number(t.discountAmt) });
      }
      for (const e of expenses) {
        const label = dayFormat.format(new Date(e.date));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(e.amount);
        val.expenses += amt;
        if (e.category === "PRODUCT_PURCHASE") val.expProduct += amt;
        else if (e.category === "STAFF_PAYMENT") val.expStaff += amt;
        else val.expMisc += amt;
        groupMap.set(label, val);
      }
      for (const item of txItems) {
        const label = dayFormat.format(new Date(item.transaction.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(item.lineTotal);
        if (item.productId) val.incomeProduct += amt;
        else val.incomeService += amt;
        groupMap.set(label, val);
      }
    } else {
      const monthFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
      });
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(monthFormat.format(temp), emptyGroup());
        temp.setMonth(temp.getMonth() + 1);
      }
      for (const t of transactions) {
        const label = monthFormat.format(new Date(t.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        groupMap.set(label, { ...val, revenue: val.revenue + Number(t.total), discount: val.discount + Number(t.discountAmt) });
      }
      for (const e of expenses) {
        const label = monthFormat.format(new Date(e.date));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(e.amount);
        val.expenses += amt;
        if (e.category === "PRODUCT_PURCHASE") val.expProduct += amt;
        else if (e.category === "STAFF_PAYMENT") val.expStaff += amt;
        else val.expMisc += amt;
        groupMap.set(label, val);
      }
      for (const item of txItems) {
        const label = monthFormat.format(new Date(item.transaction.createdAt));
        const val = groupMap.get(label) || emptyGroup();
        const amt = Number(item.lineTotal);
        if (item.productId) val.incomeProduct += amt;
        else val.incomeService += amt;
        groupMap.set(label, val);
      }
    }

    const revenueData = Array.from(groupMap.entries()).map(([label, val]) => ({
      month: label,
      revenue: Math.round(val.revenue),
      expenses: Math.round(val.expenses),
      profit: Math.round(val.revenue - val.expenses),
      discount: Math.round(val.discount),
      incomeService: Math.round(val.incomeService),
      incomeProduct: Math.round(val.incomeProduct),
      expProduct: Math.round(val.expProduct),
      expStaff: Math.round(val.expStaff),
      expMisc: Math.round(val.expMisc),
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
      by: ["staffId"],
      where: {
        date: { gte: from, lte: to },
        status: { in: ["COMPLETED"] },
      },
      _count: { id: true },
      _sum: { price: true },
    });
    const staffIds = staffPerformance.map((s) => s.staffId);
    const staffList = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, role: true },
    });
    const staffMap = new Map(staffList.map((s) => [s.id, s]));
    const staffStats = staffPerformance
      .map((s) => ({
        name: staffMap.get(s.staffId)?.name ?? "Unknown",
        role: staffMap.get(s.staffId)?.role ?? "STYLIST",
        bookings: s._count.id,
        revenue: Number(s._sum.price ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      revenueData,
      serviceRevenue,
      staffStats,
      weeklyData,
      kpis: [
        { 
          label: "Total Revenue (Period)", 
          value: `₹${totalRevenue.toLocaleString("en-IN")}`, 
          change: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`, 
          up: revenueChange >= 0,
          rawValue: totalRevenue,
          prevValue: prevRevenue,
          difference: totalRevenue - prevRevenue,
          type: "currency"
        },
        { 
          label: "Net Profit Margin", 
          value: `₹${profit.toLocaleString("en-IN")}`, 
          change: `${profitChange >= 0 ? "+" : ""}${profitChange.toFixed(1)}%`, 
          up: profitChange >= 0,
          rawValue: profit,
          prevValue: prevProfit,
          difference: profit - prevProfit,
          type: "currency"
        },
        { 
          label: "Expenses", 
          value: `₹${totalExpenses.toLocaleString("en-IN")}`, 
          change: `${expensesChange >= 0 ? "+" : ""}${expensesChange.toFixed(1)}%`, 
          up: expensesChange <= 0,
          rawValue: totalExpenses,
          prevValue: prevExpensesSum,
          difference: totalExpenses - prevExpensesSum,
          type: "currency"
        },
        { 
          label: "Customer Retention", 
          value: `${retentionRate.toFixed(0)}%`, 
          change: `${retentionChange >= 0 ? "+" : ""}${retentionChange.toFixed(1)}%`, 
          up: retentionChange >= 0,
          rawValue: retentionRate,
          prevValue: prevRetentionRate,
          difference: retentionRate - prevRetentionRate,
          type: "percentage"
        }
      ]
    };
  },
  ["analytics-data-v2"],
  {
    revalidate: 3600, // 1 hour cache time
    tags: ["analytics-v2"]
  }
);

// GET /api/analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const to = new Date(searchParams.get("to") ?? new Date());
    const from = new Date(searchParams.get("from") ?? new Date(to.getFullYear(), to.getMonth() - 5, 1));
    const period = searchParams.get("period") ?? "6M";

    const cachedData = await getCachedAnalytics(
      from.toISOString(),
      to.toISOString(),
      period
    );

    // Deep copy/shallow copy the returned object so we don't mutate cache references directly
    const data = {
      ...cachedData,
      revenueData: [...cachedData.revenueData],
    };

    if (period === "1D") {
      const nowKolkata = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const todayKolkataStr = nowKolkata.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const toKolkataStr = to.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const isToday = toKolkataStr === todayKolkataStr;

      if (isToday) {
        const currentKolkataTimeStr = `${String(nowKolkata.getHours()).padStart(2, "0")}:${String(nowKolkata.getMinutes()).padStart(2, "0")}`;
        let endLabel = "21:30";
        if (currentKolkataTimeStr < "21:30") {
          endLabel = currentKolkataTimeStr < "09:00" ? "09:00" : currentKolkataTimeStr;
        }

        // Filter out any labels that are outside 09:00 to endLabel
        data.revenueData = data.revenueData.filter((r) => r.month >= "09:00" && r.month <= endLabel);

        // Ensure the endLabel point is present to draw the line/area to the current time
        if (!data.revenueData.some((r) => r.month === endLabel)) {
          data.revenueData.push({
            month: endLabel,
            revenue: 0,
            expenses: 0,
            profit: 0,
            discount: 0,
            incomeService: 0,
            incomeProduct: 0,
            expProduct: 0,
            expStaff: 0,
            expMisc: 0,
          });
        }

        // Ensure chronological sorting of keys
        data.revenueData.sort((a, b) => a.month.localeCompare(b.month));
      } else {
        // For historical days, filter strictly within 09:00 and 21:30
        data.revenueData = data.revenueData.filter((r) => r.month >= "09:00" && r.month <= "21:30");
      }
    }

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
