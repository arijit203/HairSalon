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

    // ── Monthly revenue breakdown
    const transactions = await prisma.transaction.findMany({
      where:   { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      select:  { total: true, createdAt: true },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();
    for (const t of transactions) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(t.total));
    }

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

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
      monthlyRevenue,
      serviceBreakdown,
      staffStats,
      topProducts:      topProductStats,
      tierDistribution: tierDistribution.map((t) => ({ tier: t.tier, count: t._count.id })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
