/**
 * Server-side data fetcher — runs directly against Prisma (no HTTP round trip).
 * Only import this in Server Components (no "use client" at the top).
 */
import { prisma } from "@/lib/prisma";

// ── Dashboard stats ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const now         = new Date();
  const todayStart  = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayEnd    = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    thisMonthRev, lastMonthRev,
    todayAppts,
    totalClients, newClients,
    thisSold, lastSold,
    lowStock,
    todaySchedule,
  ] = await Promise.all([
    prisma.transaction.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.appointment.count({ where: { date: { gte: todayStart, lt: todayEnd } } }),
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.transactionItem.aggregate({ where: { productId: { not: null }, transaction: { createdAt: { gte: monthStart, lte: monthEnd } } }, _sum: { quantity: true } }),
    prisma.transactionItem.aggregate({ where: { productId: { not: null }, transaction: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }, _sum: { quantity: true } }),
    prisma.product.count({ where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] }, isActive: true } }),
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

  const thisRev = Number(thisMonthRev._sum.total ?? 0);
  const lastRev = Number(lastMonthRev._sum.total ?? 0);

  return {
    revenue:      { thisMonth: thisRev, lastMonth: lastRev, changePercent: lastRev > 0 ? +((thisRev - lastRev) / lastRev * 100).toFixed(1) : 0 },
    bookings:     { today: todayAppts },
    clients:      { total: totalClients, newThisMonth: newClients },
    productsSold: { thisMonth: thisSold._sum.quantity ?? 0, lastMonth: lastSold._sum.quantity ?? 0 },
    alerts:       { lowStockCount: lowStock },
    todayAppointments: todaySchedule,
  };
}

// ── Monthly revenue for chart ─────────────────────────────────────────────────
export async function getMonthlyRevenue(months = 6) {
  const to   = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1);

  const txns = await prisma.transaction.findMany({
    where:  { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
    select: { total: true, createdAt: true },
  });

  const map = new Map<string, number>();
  for (const t of txns) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + Number(t.total));
  }

  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, revenue]) => ({ month, revenue }));
}

// ── Service breakdown for pie chart ──────────────────────────────────────────
export async function getServiceBreakdown(months = 6) {
  const to   = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1);

  const rows = await prisma.transactionItem.groupBy({
    by:      ["serviceId"],
    where:   { serviceId: { not: null }, transaction: { createdAt: { gte: from, lte: to }, status: "COMPLETED" } },
    _sum:    { lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take:    6,
  });

  const services = await prisma.service.findMany({
    where:  { id: { in: rows.map(r => r.serviceId!) } },
    select: { id: true, name: true, category: true },
  });

  const sMap = new Map(services.map(s => [s.id, s]));
  return rows.map(r => ({
    name:     sMap.get(r.serviceId!)?.name     ?? "Unknown",
    category: sMap.get(r.serviceId!)?.category ?? "Unknown",
    revenue:  Number(r._sum.lineTotal ?? 0),
  }));
}

// ── Products list ─────────────────────────────────────────────────────────────
export async function getProducts({ search = "", category = "", status = "", page = 1, limit = 15 } = {}) {
  const where = {
    isActive: true,
    ...(category && { category }),
    ...(status   && { status: status as any }),
    ...(search   && { OR: [
      { name:  { contains: search, mode: "insensitive" as const } },
      { brand: { contains: search, mode: "insensitive" as const } },
      { sku:   { contains: search, mode: "insensitive" as const } },
    ]}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where }),
  ]);

  return { products, total, totalPages: Math.ceil(total / limit) };
}

// ── Services list ─────────────────────────────────────────────────────────────
export async function getServices({ search = "", category = "" } = {}) {
  const where = {
    isActive: true,
    ...(category && { category }),
    ...(search   && { OR: [
      { name:        { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ]}),
  };

  return prisma.service.findMany({
    where,
    orderBy: [{ isPopular: "desc" }, { category: "asc" }],
    include: { _count: { select: { appointments: true } } },
  });
}

// ── Clients list ──────────────────────────────────────────────────────────────
export async function getClients({ search = "", tier = "", page = 1, limit = 12 } = {}) {
  const where = {
    isActive: true,
    ...(tier   && { tier: tier as any }),
    ...(search && { OR: [
      { name:  { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
    ]}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { totalSpent: "desc" } }),
    prisma.client.count({ where }),
  ]);

  return { clients, total, totalPages: Math.ceil(total / limit) };
}

// ── Appointments for a date ───────────────────────────────────────────────────
export async function getAppointmentsByDate(dateStr: string) {
  const date     = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

  return prisma.appointment.findMany({
    where:   { date: { gte: dayStart, lt: dayEnd } },
    orderBy: { startTime: "asc" },
    include: {
      client:  { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, duration: true, category: true } },
      staff:   { select: { id: true, name: true } },
    },
  });
}
