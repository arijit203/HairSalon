import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: { isActive: true }
  });

  console.log(`Recalculating stats for ${clients.length} active clients...`);

  for (const client of clients) {
    const completedAppts = await prisma.appointment.findMany({
      where: { clientId: client.id, status: "COMPLETED" },
      select: { transactionId: true, date: true, price: true }
    });

    const completedTxs = await prisma.transaction.aggregate({
      where: { clientId: client.id, status: "COMPLETED" },
      _sum: { total: true }
    });

    const standaloneApptSum = completedAppts
      .filter(a => !a.transactionId)
      .reduce((sum, a) => sum + Number(a.price || 0), 0);

    const totalSpent = Number(completedTxs._sum.total || 0) + standaloneApptSum;

    const transactionIds = new Set<string>();
    const standaloneDates = new Set<string>();

    for (const appt of completedAppts) {
      if (appt.transactionId) {
        transactionIds.add(appt.transactionId);
      } else {
        const dateStr = appt.date instanceof Date 
          ? appt.date.toISOString().split("T")[0]
          : new Date(appt.date).toISOString().split("T")[0];
        standaloneDates.add(dateStr);
      }
    }

    const visits = transactionIds.size + standaloneDates.size;
    const loyaltyPoints = Math.floor(totalSpent / 100);

    let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
    if (totalSpent >= 50000) tier = "PLATINUM";
    else if (totalSpent >= 25000) tier = "GOLD";
    else if (totalSpent >= 10000) tier = "SILVER";

    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalSpent,
        totalVisits: visits,
        loyaltyPoints,
        tier
      }
    });

    console.log(`Updated client: ${client.name} | Visits: ${visits} (was ${client.totalVisits}) | Total Spent: ₹${totalSpent} | Tier: ${tier}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
