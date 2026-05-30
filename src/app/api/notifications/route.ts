import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

function getKolkataDateParts() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const formatted = formatter.format(new Date());
  const [month, day, year] = formatted.split("/");
  
  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10) - 1, // 0-indexed
    day: parseInt(day, 10),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const { year, month, day } = getKolkataDateParts();
    // Query db.Date field with UTC midnight representation
    const today = new Date(Date.UTC(year, month, day));

    const [lowStockProducts, pendingAppointments, pendingTransactions, recentCompleted] = await Promise.all([
      // 1. Low stock products (Alerts)
      prisma.product.findMany({
        where: {
          isActive: true,
          status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] }
        },
        select: { id: true, name: true, stock: true, status: true },
        orderBy: { stock: "asc" },
        take: 5
      }),
      // 2. Today's pending appointments (Urgent check-ins)
      prisma.appointment.findMany({
        where: {
          date: today,
          status: "PENDING"
        },
        include: {
          client: { select: { name: true } },
          service: { select: { name: true } }
        },
        orderBy: { startTime: "asc" }
      }),
      // 3. Pending payment transactions (Unpaid invoices)
      prisma.transaction.findMany({
        where: { status: "PENDING" },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      // 4. Today's completed appointments (Recent activity count)
      prisma.appointment.findMany({
        where: {
          date: today,
          status: "COMPLETED"
        },
        select: { id: true }
      })
    ]);

    const items: any[] = [];

    // 1. Urgent low stock alerts
    for (const p of lowStockProducts) {
      items.push({
        id: `prod_${p.id}`,
        text: p.status === "OUT_OF_STOCK" 
          ? `Out of stock: ${p.name}` 
          : `Low stock: ${p.name} (${p.stock} left)`,
        time: "Check inventory",
        dot: "glow-dot-rose"
      });
    }

    // 2. Today's pending appointments
    for (const appt of pendingAppointments) {
      items.push({
        id: `appt_pend_${appt.id}`,
        text: `Pending check-in: ${appt.client.name} (${appt.service.name} at ${appt.startTime})`,
        time: "Today's Booking",
        dot: "glow-dot-gold"
      });
    }

    // 3. Unpaid invoices/pending transactions
    for (const tx of pendingTransactions) {
      items.push({
        id: `tx_${tx.id}`,
        text: `Unpaid invoice: ${tx.client?.name ?? "Walk-in"} (₹${Number(tx.total).toLocaleString("en-IN")})`,
        time: "Pending payment",
        dot: "glow-dot-gold"
      });
    }

    // 4. Today's completed bookings activity
    if (recentCompleted.length > 0) {
      items.push({
        id: `appt_comp_summary`,
        text: `${recentCompleted.length} booking${recentCompleted.length > 1 ? "s" : ""} completed today`,
        time: "Recent activity",
        dot: "glow-dot-green"
      });
    }

    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}
