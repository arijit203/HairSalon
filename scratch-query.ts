import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log("Current server Date object:", now.toString());
  console.log("Current server ISO string:", now.toISOString());
  console.log("now.getFullYear():", now.getFullYear());
  console.log("now.getMonth():", now.getMonth());
  console.log("now.getDate():", now.getDate());

  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  console.log("todayStart:", todayStart.toISOString());
  console.log("todayEnd:", todayEnd.toISOString());

  const appts = await prisma.appointment.findMany({
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
    }
  });

  console.log("\nAll Appointments in DB:");
  for (const a of appts) {
    console.log({
      id: a.id,
      clientName: a.client.name,
      serviceName: a.service.name,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
