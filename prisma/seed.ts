import { PrismaClient, StaffRole, StaffStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cleanslate database seeding...");

  // Delete all existing data in proper dependency order
  console.log("🧹 Clearing existing database records...");
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.client.deleteMany();
  await prisma.salonSettings.deleteMany();

  // Create the single production admin user
  const email = "madoesalon@gmail.com";
  const password = "Abcd@1234";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log("👤 Seeding primary administrator...");
  await prisma.staff.upsert({
    where: { email },
    update: {
      name: "Madoe Salon Admin",
      passwordHash,
      role: StaffRole.ADMIN,
      status: StaffStatus.ACTIVE,
      isActive: true,
    },
    create: {
      name: "Madoe Salon Admin",
      email,
      passwordHash,
      role: StaffRole.ADMIN,
      status: StaffStatus.ACTIVE,
      isActive: true,
    },
  });

  console.log("✅ Production Admin seeded successfully!");
  console.log(`   Admin Login: ${email} / ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
