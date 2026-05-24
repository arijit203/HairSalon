import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Use UTC dates to query @db.Date fields without timezone shifts
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayEnd   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  console.log("todayStart:", todayStart.toISOString());
  console.log("todayEnd:", todayEnd.toISOString());

  // Today's booking count
  const todayBookings = await prisma.appointment.count({
    where: { date: { gte: todayStart, lt: todayEnd } },
  });

  // Today's new bookings (created today)
  const todayBookingsTotal = await prisma.appointment.count({
    where: { createdAt: { gte: todayStart, lt: todayEnd } },
  });

  // Today's appointments with details
  const todayAppointments = await prisma.appointment.findMany({
    where: { date: { gte: todayStart, lt: todayEnd } },
    orderBy: { startTime: "asc" },
    include: {
      client:  { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      staff:   { select: { id: true, name: true } },
    },
  });

  console.log("\nResults:");
  console.log("todayBookings count:", todayBookings);
  console.log("todayBookingsTotal (created today) count:", todayBookingsTotal);
  console.log("todayAppointments list length:", todayAppointments.length);
  for (const a of todayAppointments) {
    console.log({
      id: a.id,
      clientName: a.client.name,
      serviceName: a.service.name,
      date: a.date.toISOString(),
      startTime: a.startTime,
      status: a.status,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
