import { prisma } from "@/lib/prisma";

export async function updateClientStats(clientId: string, tx?: any) {
  const db = tx || prisma;

  // 1. Get all completed appointments for the client
  const completedAppts = await db.appointment.findMany({
    where: { clientId, status: "COMPLETED" },
    select: { transactionId: true, date: true, price: true }
  });

  // 2. Get all completed transactions for the client
  const completedTxs = await db.transaction.aggregate({
    where: { clientId, status: "COMPLETED" },
    _sum: { total: true }
  });

  // 3. Standalone completed appointments sum (where transactionId is null)
  const standaloneApptSum = completedAppts
    .filter((a: any) => !a.transactionId)
    .reduce((sum: number, a: any) => sum + Number(a.price || 0), 0);


  const totalSpent = Number(completedTxs._sum.total || 0) + standaloneApptSum;
  
  // 4. Calculate unique visits:
  // - Each unique non-null transactionId is 1 visit.
  // - Standalone completed appointments (transactionId is null) are grouped by calendar date (each unique date is 1 visit).
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

  // 5. Calculate Tier
  let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
  if (totalSpent >= 50000) tier = "PLATINUM";
  else if (totalSpent >= 25000) tier = "GOLD";
  else if (totalSpent >= 10000) tier = "SILVER";

  await db.client.update({
    where: { id: clientId },
    data: {
      totalSpent,
      totalVisits: visits,
      loyaltyPoints,
      tier,
    },
  });
}
