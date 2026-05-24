import { PrismaClient, ProductStatus, StaffRole, StaffStatus, ClientTier, AppointmentStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 0, 0, 0);
const TODAY = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

async function main() {
  console.log("🌱 Seeding database...");

  // Clear data so re-seeding is safe
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staffInputs = [
    { name: "Salon Admin", email: "admin@wyapar.com", role: StaffRole.ADMIN,           password: "Admin@123" },
    { name: "Madoe Salon Admin", email: "madoesalon@gmail.com", role: StaffRole.ADMIN,  password: "Abcd@1234" },
    { name: "Maria K.",    email: "maria@wyapar.com",  role: StaffRole.SENIOR_STYLIST,  password: "Staff@123" },
    { name: "Jana L.",     email: "jana@wyapar.com",   role: StaffRole.ESTHETICIAN,     password: "Staff@123" },
    { name: "Priya S.",    email: "priya@wyapar.com",  role: StaffRole.NAIL_TECHNICIAN, password: "Staff@123" },
    { name: "Rina D.",     email: "rina@wyapar.com",   role: StaffRole.NAIL_TECHNICIAN, password: "Staff@123", status: StaffStatus.ON_LEAVE },
  ];
  for (const { password, status = StaffStatus.ACTIVE, ...d } of staffInputs) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.staff.upsert({ where: { email: d.email }, update: {}, create: { ...d, passwordHash, status } });
  }
  console.log("✅ Staff seeded");

  // ── Services ──────────────────────────────────────────────────────────────
  const svcInputs = [
    { name: "Hair Cut & Style",       category: "Hair Care",     price: 800,   isPopular: true  },
    { name: "Hair Coloring (Full)",   category: "Hair Care",     price: 4500,  discountPrice: 3999, isPopular: true },
    { name: "Deep Conditioning",      category: "Hair Care",     price: 2200,  isPopular: false },
    { name: "Classic Facial",         category: "Skin Care",     price: 1800,  isPopular: true  },
    { name: "Anti-Aging Facial",      category: "Skin Care",     price: 3500,  isPopular: false },
    { name: "Gel Manicure",           category: "Nail Care",     price: 900,   isPopular: true  },
    { name: "Mani + Pedi Combo",      category: "Nail Care",     price: 1600,  discountPrice: 1399, isPopular: true },
    { name: "Full Body Waxing",       category: "Body Care",     price: 2800,  isPopular: false },
    { name: "Bridal Package",         category: "Packages",      price: 15000, discountPrice: 12999, isPopular: true },
  ];

  // Update existing database services with old categories to use the new standardized names
  await prisma.service.updateMany({
    where: { category: "Hair" },
    data: { category: "Hair Care" }
  });
  await prisma.service.updateMany({
    where: { category: "Skin & Facial" },
    data: { category: "Skin Care" }
  });
  await prisma.service.updateMany({
    where: { category: "Nails" },
    data: { category: "Nail Care" }
  });
  await prisma.service.updateMany({
    where: { category: "Body & Wax" },
    data: { category: "Body Care" }
  });

  for (const s of svcInputs) {
    const id = s.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    await prisma.service.upsert({ 
      where: { id }, 
      update: {
        category: s.category,
        price: s.price,
        discountPrice: s.discountPrice,
        isPopular: s.isPopular
      }, 
      create: { ...s, id } 
    });
  }
  console.log("✅ Services seeded");

  // ── Products ──────────────────────────────────────────────────────────────
  const prodInputs = [
    { name: "Kérastase Nutritive Serum",    category: ["Hair Care"], brand: "Kérastase",   sku: "KER-001", price: 2800, stock: 18, lowStockAt: 5 },
    { name: "L'Oreal Professionnel Masque", category: ["Hair Care"], brand: "L'Oreal Pro", sku: "LOR-002", price: 1950, stock: 25, lowStockAt: 8 },
    { name: "OPI Nail Polish Collection",   category: ["Nail Care"], brand: "OPI",          sku: "OPI-003", price: 850,  stock: 8,  lowStockAt: 10, status: ProductStatus.LOW_STOCK },
    { name: "Moroccanoil Treatment",        category: ["Hair Care"], brand: "Moroccanoil", sku: "MOR-004", price: 3200, stock: 32, lowStockAt: 8 },
    { name: "The Ordinary Niacinamide",     category: ["Skin Care"], brand: "The Ordinary",sku: "ORD-005", price: 650,  stock: 0,  lowStockAt: 10, status: ProductStatus.OUT_OF_STOCK },
    { name: "Dyson Airwrap Styler",         category: ["Tools"],     brand: "Dyson",        sku: "DYS-006", price: 45000,stock: 5, lowStockAt: 2 },
    { name: "Cetaphil Moisturizing Cream",  category: ["Skin Care"], brand: "Cetaphil",     sku: "CET-007", price: 480,  stock: 60, lowStockAt: 15 },
    { name: "Bath & Body Works Lotion",     category: ["Body Care"], brand: "Bath & Body",  sku: "BBW-008", price: 1200, stock: 3,  lowStockAt: 10, status: ProductStatus.LOW_STOCK },
  ];
  for (const { status = ProductStatus.IN_STOCK, ...p } of prodInputs) {
    await prisma.product.upsert({ 
      where: { sku: p.sku }, 
      update: {
        category: p.category,
        price: p.price,
        stock: p.stock,
        lowStockAt: p.lowStockAt,
        status
      }, 
      create: { ...p, status } 
    });
  }
  console.log("✅ Products seeded");

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientInputs = [
    { name: "Sophia Chen",   email: "sophia@example.com",   phone: "+91 9876543210", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
    { name: "Isabella Rose", email: "isabella@example.com", phone: "+91 9876543211", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
    { name: "Emma Davis",    email: "emma@example.com",     phone: "+91 9876543212", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
    { name: "Olivia Martin", email: "olivia@example.com",   phone: "+91 9876543213", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
    { name: "Zara Ahmed",    email: "zara@example.com",     phone: "+91 9876543214", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
    { name: "Priya Patel",   email: "priyap@example.com",   phone: "+91 9876543215", tier: ClientTier.BRONZE, loyaltyPoints: 0, totalSpent: 0, totalVisits: 0 },
  ];
  const clientPasswordHash = await bcrypt.hash("Client@123", 10);
  for (const c of clientInputs) {
    await prisma.client.upsert({
      where: { email: c.email },
      update: {
        passwordHash: clientPasswordHash,
        loyaltyPoints: c.loyaltyPoints,
        totalSpent: c.totalSpent,
        totalVisits: c.totalVisits,
        tier: c.tier,
      },
      create: { ...c, passwordHash: clientPasswordHash },
    });
  }
  console.log("✅ Clients seeded");

  console.log("\n🎉 Database seeded successfully!");
  console.log("   Admin: madoesalon@gmail.com / Abcd@1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());
