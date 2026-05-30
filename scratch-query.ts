import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.salonSettings.upsert({
    where: { key: "salon_name" },
    update: { value: "Madoe Beauty Salon" },
    create: { key: "salon_name", value: "Madoe Beauty Salon" },
  });
  console.log("Upserted salon_name:", result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
