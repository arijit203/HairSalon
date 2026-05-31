import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  const services = await prisma.service.findMany();

  console.log("=== PRODUCTS ===");
  products.forEach(p => {
    console.log(`Name: ${p.name} | Category: ${JSON.stringify(p.category)} | SKU: ${p.sku}`);
  });

  console.log("=== SERVICES ===");
  services.forEach(s => {
    console.log(`Name: ${s.name} | Category: ${s.category}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
