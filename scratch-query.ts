import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.count();
  const staff = await prisma.staff.count();
  const clients = await prisma.client.count();
  const settings = await prisma.salonSettings.count();
  
  console.log("Counts in DB - Products:", products, "| Staff:", staff, "| Clients:", clients, "| Settings:", settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
