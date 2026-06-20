import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clientName = process.argv[2];
  if (!clientName) {
    console.log("Please provide a client name as an argument. Example: npx tsx scratch-query.ts \"Sanjay Roy\"");
    return;
  }

  const client = await prisma.client.findFirst({
    where: { name: { contains: clientName, mode: "insensitive" } }
  });

  if (!client) {
    console.log(`Client "${clientName}" not found`);
    return;
  }

  const appointments = await prisma.appointment.findMany({
    where: { clientId: client.id },
    select: { id: true, date: true, startTime: true, status: true, transactionId: true }
  });

  console.log(`Appointments for ${client.name} (${client.id}):`);
  for (const a of appointments) {
    console.log(`ID: ${a.id} | Date: ${a.date.toISOString().split('T')[0]} | Time: ${a.startTime} | Status: ${a.status} | TxId: ${a.transactionId}`);
  }

  const transactions = await prisma.transaction.findMany({
    where: { clientId: client.id }
  });

  console.log(`\nTransactions for ${client.name}:`);
  for (const tx of transactions) {
    console.log(`ID: ${tx.id} | Total: ${tx.total} | Method: ${tx.paymentMethod} | Date: ${tx.createdAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
