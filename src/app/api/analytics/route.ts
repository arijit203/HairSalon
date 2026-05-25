import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";


// GET /api/analytics?from=2026-01-01&to=2026-07-31
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // Default: last 6 months
    const to   = new Date(searchParams.get("to")   ?? new Date());
    const from = new Date(searchParams.get("from") ?? new Date(to.getFullYear(), to.getMonth() - 5, 1));
    const period = searchParams.get("period") ?? "6M";

    // ── Revenue breakdown by period
    const transactions = await prisma.transaction.findMany({
      where:   { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      select:  { total: true, createdAt: true },
    });

    const groupMap = new Map<string, number>();

    if (period === "1D") {
      // Group by hour in Asia/Kolkata timezone
      for (let h = 9; h <= 21; h++) {
        const label = `${String(h).padStart(2, "0")}:00`;
        groupMap.set(label, 0);
      }
      
      for (const t of transactions) {
        const hourStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          hour12: false,
        }).format(t.createdAt);
        const label = `${hourStr}:00`;
        groupMap.set(label, (groupMap.get(label) ?? 0) + Number(t.total));
      }
    } else if (period === "1M") {
      // Group by day of the month in Asia/Kolkata timezone
      const dayFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
      });
      
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(dayFormat.format(temp), 0);
        temp.setDate(temp.getDate() + 1);
      }
      
      for (const t of transactions) {
        const label = dayFormat.format(t.createdAt);
        if (groupMap.has(label)) {
          groupMap.set(label, (groupMap.get(label) ?? 0) + Number(t.total));
        } else {
          groupMap.set(label, Number(t.total));
        }
      }
    } else {
      // Group by month in Asia/Kolkata timezone (for 3M, 6M)
      const monthFormat = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
      });
      
      const temp = new Date(from);
      while (temp <= to) {
        groupMap.set(monthFormat.format(temp), 0);
        temp.setMonth(temp.getMonth() + 1);
      }
      
      for (const t of transactions) {
        const label = monthFormat.format(t.createdAt);
        if (groupMap.has(label)) {
          groupMap.set(label, (groupMap.get(label) ?? 0) + Number(t.total));
        } else {
          groupMap.set(label, Number(t.total));
        }
      }
    }

    const revenueData = Array.from(groupMap.entries()).map(([label, revenue]) => ({
      label,
      revenue,
    }));

    // ── Revenue by service category
    const serviceRevenue = await prisma.transactionItem.groupBy({
      by:      ["serviceId"],
      where:   {
        serviceId:   { not: null },
        transaction: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      },
      _sum:    { lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
    });

    // Enrich with service names/categories
    const serviceIds = serviceRevenue.map((s) => s.serviceId!);
    const services = await prisma.service.findMany({
      where:  { id: { in: serviceIds } },
      select: { id: true, name: true, category: true },
    });

    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const serviceBreakdown = serviceRevenue.map((s) => ({
      serviceId: s.serviceId,
      name:     serviceMap.get(s.serviceId!)?.name     ?? "Unknown",
      category: serviceMap.get(s.serviceId!)?.category ?? "Unknown",
      revenue:  Number(s._sum.lineTotal ?? 0),
    }));

    // ── Staff performance
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
        staffId:  s.staffId,
        name:     staffMap.get(s.staffId)?.name     ?? "Unknown",
        role:     staffMap.get(s.staffId)?.role     ?? "STYLIST",
        bookings: s._count.id,
        revenue:  Number(s._sum.price ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Top products
    const topProducts = await prisma.transactionItem.groupBy({
      by:      ["productId"],
      where:   {
        productId:   { not: null },
        transaction: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      },
      _sum:    { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take:    10,
    });

    const productIds = topProducts.map((p) => p.productId!);
    const productList = await prisma.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true, name: true, brand: true },
    });

    const productMap = new Map(productList.map((p) => [p.id, p]));
    const topProductStats = topProducts.map((p) => ({
      productId: p.productId,
      name:     productMap.get(p.productId!)?.name  ?? "Unknown",
      brand:    productMap.get(p.productId!)?.brand ?? "Unknown",
      unitsSold: p._sum.quantity ?? 0,
      revenue:  Number(p._sum.lineTotal ?? 0),
    }));

    // ── Client tier distribution
    const tierDistribution = await prisma.client.groupBy({
      by:     ["tier"],
      where:  { isActive: true },
      _count: { id: true },
    });

    return successResponse({
      period:           { from, to },
      revenueData,
      serviceBreakdown,
      staffStats,
      topProducts:      topProductStats,
      tierDistribution: tierDistribution.map((t) => ({ tier: t.tier, count: t._count.id })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
