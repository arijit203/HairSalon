import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { date: "desc" },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
    }
  });
  console.log(`Total appointments in DB: ${appointments.length}`);
  appointments.forEach(a => {
    console.log(`ID: ${a.id} | Date: ${a.date.toISOString().split('T')[0]} | Time: ${a.startTime} | Status: ${a.status} | Client: ${a.client.name} | Service: ${a.service.name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
