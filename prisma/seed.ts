import { PrismaClient, ProductStatus, StaffRole, StaffStatus, ClientTier, AppointmentStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 0, 0, 0);
const TODAY = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

async function main() {
  console.log("🌱 Seeding database...");

  // Clear time-sensitive data so re-seeding is safe
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();

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
    { name: "Hair Cut & Style",       category: "Hair",          price: 800,   duration: 45,  isPopular: true  },
    { name: "Hair Coloring (Full)",   category: "Hair",          price: 4500,  discountPrice: 3999, duration: 120, isPopular: true },
    { name: "Deep Conditioning",      category: "Hair",          price: 2200,  duration: 60,  isPopular: false },
    { name: "Classic Facial",         category: "Skin & Facial", price: 1800,  duration: 60,  isPopular: true  },
    { name: "Anti-Aging Facial",      category: "Skin & Facial", price: 3500,  duration: 90,  isPopular: false },
    { name: "Gel Manicure",           category: "Nails",         price: 900,   duration: 60,  isPopular: true  },
    { name: "Mani + Pedi Combo",      category: "Nails",         price: 1600,  discountPrice: 1399, duration: 100, isPopular: true },
    { name: "Full Body Waxing",       category: "Body & Wax",    price: 2800,  duration: 90,  isPopular: false },
    { name: "Bridal Package",         category: "Packages",      price: 15000, discountPrice: 12999, duration: 300, isPopular: true },
  ];
  for (const s of svcInputs) {
    const id = s.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    await prisma.service.upsert({ where: { id }, update: {}, create: { ...s, id } });
  }
  console.log("✅ Services seeded");

  // ── Products ──────────────────────────────────────────────────────────────
  const prodInputs = [
    { name: "Kérastase Nutritive Serum",    category: "Hair Care", brand: "Kérastase",   sku: "KER-001", price: 2800, stock: 18, lowStockAt: 5 },
    { name: "L'Oreal Professionnel Masque", category: "Hair Care", brand: "L'Oreal Pro", sku: "LOR-002", price: 1950, stock: 25, lowStockAt: 8 },
    { name: "OPI Nail Polish Collection",   category: "Nail Care", brand: "OPI",          sku: "OPI-003", price: 850,  stock: 8,  lowStockAt: 10, status: ProductStatus.LOW_STOCK },
    { name: "Moroccanoil Treatment",        category: "Hair Care", brand: "Moroccanoil", sku: "MOR-004", price: 3200, stock: 32, lowStockAt: 8 },
    { name: "The Ordinary Niacinamide",     category: "Skin Care", brand: "The Ordinary",sku: "ORD-005", price: 650,  stock: 0,  lowStockAt: 10, status: ProductStatus.OUT_OF_STOCK },
    { name: "Dyson Airwrap Styler",         category: "Tools",     brand: "Dyson",        sku: "DYS-006", price: 45000,stock: 5, lowStockAt: 2 },
    { name: "Cetaphil Moisturizing Cream",  category: "Skin Care", brand: "Cetaphil",     sku: "CET-007", price: 480,  stock: 60, lowStockAt: 15 },
    { name: "Bath & Body Works Lotion",     category: "Body Care", brand: "Bath & Body",  sku: "BBW-008", price: 1200, stock: 3,  lowStockAt: 10, status: ProductStatus.LOW_STOCK },
  ];
  for (const { status = ProductStatus.IN_STOCK, ...p } of prodInputs) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: { ...p, status } });
  }
  console.log("✅ Products seeded");

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientInputs = [
    { name: "Sophia Chen",   email: "sophia@example.com",   phone: "+91 9876543210", tier: ClientTier.PLATINUM, loyaltyPoints: 3240, totalSpent: 86400, totalVisits: 42 },
    { name: "Isabella Rose", email: "isabella@example.com", phone: "+91 9876543211", tier: ClientTier.GOLD,     loyaltyPoints: 1840, totalSpent: 48200, totalVisits: 28 },
    { name: "Emma Davis",    email: "emma@example.com",     phone: "+91 9876543212", tier: ClientTier.GOLD,     loyaltyPoints: 1240, totalSpent: 32100, totalVisits: 19 },
    { name: "Olivia Martin", email: "olivia@example.com",   phone: "+91 9876543213", tier: ClientTier.SILVER,   loyaltyPoints: 680,  totalSpent: 18400, totalVisits: 14 },
    { name: "Zara Ahmed",    email: "zara@example.com",     phone: "+91 9876543214", tier: ClientTier.SILVER,   loyaltyPoints: 420,  totalSpent: 12800, totalVisits: 10 },
    { name: "Priya Patel",   email: "priyap@example.com",   phone: "+91 9876543215", tier: ClientTier.BRONZE,   loyaltyPoints: 180,  totalSpent: 4200,  totalVisits: 6  },
  ];
  const clientPasswordHash = await bcrypt.hash("Client@123", 10);
  for (const c of clientInputs) {
    await prisma.client.upsert({
      where: { email: c.email },
      update: { passwordHash: clientPasswordHash },
      create: { ...c, passwordHash: clientPasswordHash },
    });
  }
  console.log("✅ Clients seeded");

  // ── Look up IDs ───────────────────────────────────────────────────────────
  const SE = Object.fromEntries((await prisma.staff.findMany()).map(s => [s.email, s.id]));
  const SN = Object.fromEntries((await prisma.service.findMany()).map(s => [s.name, s.id]));
  const CE = Object.fromEntries((await prisma.client.findMany()).map(c => [c.email, c.id]));
  const PN = Object.fromEntries((await prisma.product.findMany()).map(p => [p.sku, p.id]));

  // ── Appointments ──────────────────────────────────────────────────────────
  const appts = [
    // Today
    { ce: "sophia@example.com",   sn: "Hair Coloring (Full)",  se: "maria@wyapar.com",  date: TODAY(), st: "09:00", et: "11:00", status: AppointmentStatus.IN_PROGRESS, price: 3999 },
    { ce: "isabella@example.com", sn: "Classic Facial",        se: "jana@wyapar.com",   date: TODAY(), st: "10:30", et: "11:30", status: AppointmentStatus.CONFIRMED,    price: 1800 },
    { ce: "emma@example.com",     sn: "Gel Manicure",          se: "priya@wyapar.com",  date: TODAY(), st: "12:00", et: "13:00", status: AppointmentStatus.CONFIRMED,    price: 900  },
    { ce: "olivia@example.com",   sn: "Hair Cut & Style",      se: "maria@wyapar.com",  date: TODAY(), st: "14:00", et: "14:45", status: AppointmentStatus.PENDING,      price: 800  },
    { ce: "zara@example.com",     sn: "Anti-Aging Facial",     se: "jana@wyapar.com",   date: TODAY(), st: "15:30", et: "17:00", status: AppointmentStatus.CONFIRMED,    price: 3500 },
    { ce: "priyap@example.com",   sn: "Mani + Pedi Combo",     se: "priya@wyapar.com",  date: TODAY(), st: "16:00", et: "17:40", status: AppointmentStatus.CONFIRMED,    price: 1399 },
    // Tomorrow
    { ce: "sophia@example.com",   sn: "Deep Conditioning",     se: "maria@wyapar.com",  date: new Date(Date.now() + 86400000), st: "10:00", et: "11:00", status: AppointmentStatus.CONFIRMED, price: 2200 },
    { ce: "emma@example.com",     sn: "Bridal Package",        se: "jana@wyapar.com",   date: new Date(Date.now() + 86400000), st: "09:00", et: "14:00", status: AppointmentStatus.CONFIRMED, price: 12999 },
    // Past - completed
    { ce: "sophia@example.com",   sn: "Hair Cut & Style",      se: "maria@wyapar.com",  date: D(2026,5,15), st: "10:00", et: "10:45", status: AppointmentStatus.COMPLETED, price: 800  },
    { ce: "isabella@example.com", sn: "Full Body Waxing",      se: "priya@wyapar.com",  date: D(2026,5,14), st: "11:00", et: "12:30", status: AppointmentStatus.COMPLETED, price: 2800 },
    { ce: "emma@example.com",     sn: "Classic Facial",        se: "jana@wyapar.com",   date: D(2026,5,13), st: "14:00", et: "15:00", status: AppointmentStatus.COMPLETED, price: 1800 },
    { ce: "olivia@example.com",   sn: "Gel Manicure",          se: "priya@wyapar.com",  date: D(2026,5,12), st: "15:00", et: "16:00", status: AppointmentStatus.COMPLETED, price: 900  },
    { ce: "zara@example.com",     sn: "Hair Coloring (Full)",  se: "maria@wyapar.com",  date: D(2026,5,10), st: "09:00", et: "11:00", status: AppointmentStatus.COMPLETED, price: 3999 },
  ];
  for (const a of appts) {
    await prisma.appointment.create({
      data: { clientId: CE[a.ce], serviceId: SN[a.sn], staffId: SE[a.se], date: a.date, startTime: a.st, endTime: a.et, status: a.status, price: a.price },
    });
  }
  console.log(`✅ ${appts.length} appointments seeded`);

  // ── Transactions (historical revenue) ─────────────────────────────────────
  let counter = 1000;
  const mkInv = () => `WYP-SEED-${++counter}`;

  const txns = [
    // May 2026 (this month)
    { date: D(2026,5,18), clientEmail: "sophia@example.com",   subtotal: 4500, items: [{ sk: null, sn: "Hair Coloring (Full)", up: 4500, qty: 1 }] },
    { date: D(2026,5,17), clientEmail: "isabella@example.com", subtotal: 4600, items: [{ sk: null, sn: "Classic Facial", up: 1800, qty: 1 }, { sk: "KER-001", sn: "Kérastase Nutritive Serum", up: 2800, qty: 1 }] },
    { date: D(2026,5,16), clientEmail: "emma@example.com",     subtotal: 1750, items: [{ sk: null, sn: "Gel Manicure", up: 900, qty: 1 }, { sk: "OPI-003", sn: "OPI Nail Polish", up: 850, qty: 1 }] },
    { date: D(2026,5,15), clientEmail: "olivia@example.com",   subtotal: 2200, items: [{ sk: null, sn: "Deep Conditioning", up: 2200, qty: 1 }] },
    { date: D(2026,5,14), clientEmail: "zara@example.com",     subtotal: 3200, items: [{ sk: "MOR-004", sn: "Moroccanoil Treatment", up: 3200, qty: 1 }] },
    { date: D(2026,5,12), clientEmail: "priyap@example.com",   subtotal: 2700, items: [{ sk: null, sn: "Mani + Pedi Combo", up: 1399, qty: 1 }, { sk: "LOR-002", sn: "L'Oreal Masque", up: 1300, qty: 1 }] },
    { date: D(2026,5,10), clientEmail: "sophia@example.com",   subtotal: 5800, items: [{ sk: null, sn: "Anti-Aging Facial", up: 3500, qty: 1 }, { sk: "CET-007", sn: "Cetaphil Cream", up: 480, qty: 1 }, { sk: "KER-001", sn: "Kérastase Serum", up: 2800, qty: 1 }] },
    { date: D(2026,5,8),  clientEmail: "isabella@example.com", subtotal: 2800, items: [{ sk: null, sn: "Full Body Waxing", up: 2800, qty: 1 }] },
    // April 2026
    { date: D(2026,4,28), clientEmail: "sophia@example.com",   subtotal: 8000, items: [{ sk: null, sn: "Bridal Package", up: 12999, qty: 1 }] },
    { date: D(2026,4,22), clientEmail: "emma@example.com",     subtotal: 3700, items: [{ sk: null, sn: "Hair Coloring (Full)", up: 3999, qty: 1 }] },
    { date: D(2026,4,18), clientEmail: "olivia@example.com",   subtotal: 1800, items: [{ sk: null, sn: "Classic Facial", up: 1800, qty: 1 }] },
    { date: D(2026,4,15), clientEmail: "zara@example.com",     subtotal: 5750, items: [{ sk: "DYS-006", sn: "Dyson Airwrap", up: 45000, qty: 1 }] },
    { date: D(2026,4,10), clientEmail: "priyap@example.com",   subtotal: 1700, items: [{ sk: null, sn: "Mani + Pedi Combo", up: 1399, qty: 1 }, { sk: "OPI-003", sn: "OPI Polish", up: 850, qty: 1 }] },
    // March 2026
    { date: D(2026,3,25), clientEmail: "sophia@example.com",   subtotal: 6000, items: [{ sk: null, sn: "Hair Coloring (Full)", up: 3999, qty: 1 }, { sk: "KER-001", sn: "Kérastase Serum", up: 2800, qty: 1 }] },
    { date: D(2026,3,18), clientEmail: "isabella@example.com", subtotal: 5300, items: [{ sk: null, sn: "Anti-Aging Facial", up: 3500, qty: 1 }, { sk: "CET-007", sn: "Cetaphil Cream", up: 480, qty: 2 }] },
    { date: D(2026,3,12), clientEmail: "emma@example.com",     subtotal: 4700, items: [{ sk: null, sn: "Bridal Package", up: 12999, qty: 1 }] },
    { date: D(2026,3,5),  clientEmail: "olivia@example.com",   subtotal: 3600, items: [{ sk: null, sn: "Full Body Waxing", up: 2800, qty: 1 }, { sk: "MOR-004", sn: "Moroccanoil", up: 3200, qty: 1 }] },
    // Feb 2026
    { date: D(2026,2,20), clientEmail: "zara@example.com",     subtotal: 3800, items: [{ sk: null, sn: "Hair Coloring (Full)", up: 3999, qty: 1 }] },
    { date: D(2026,2,14), clientEmail: "sophia@example.com",   subtotal: 4200, items: [{ sk: null, sn: "Classic Facial", up: 1800, qty: 1 }, { sk: "KER-001", sn: "Kérastase Serum", up: 2800, qty: 1 }] },
    { date: D(2026,2,8),  clientEmail: "isabella@example.com", subtotal: 2900, items: [{ sk: null, sn: "Gel Manicure", up: 900, qty: 1 }, { sk: "LOR-002", sn: "L'Oreal Masque", up: 1950, qty: 1 }] },
    // Jan 2026
    { date: D(2026,1,25), clientEmail: "emma@example.com",     subtotal: 4100, items: [{ sk: null, sn: "Hair Coloring (Full)", up: 3999, qty: 1 }, { sk: "OPI-003", sn: "OPI Polish", up: 850, qty: 1 }] },
    { date: D(2026,1,15), clientEmail: "sophia@example.com",   subtotal: 5800, items: [{ sk: null, sn: "Anti-Aging Facial", up: 3500, qty: 1 }, { sk: "MOR-004", sn: "Moroccanoil", up: 3200, qty: 1 }] },
    { date: D(2026,1,8),  clientEmail: "olivia@example.com",   subtotal: 3200, items: [{ sk: null, sn: "Deep Conditioning", up: 2200, qty: 1 }, { sk: "CET-007", sn: "Cetaphil Cream", up: 480, qty: 2 }] },
  ];

  for (const t of txns) {
    const taxAmt = Math.round(t.subtotal * 0.18 * 100) / 100;
    const total  = t.subtotal + taxAmt;
    await prisma.transaction.create({
      data: {
        invoiceNumber: mkInv(),
        clientId:      CE[t.clientEmail],
        subtotal:      t.subtotal,
        discountPct:   0,
        discountAmt:   0,
        taxPct:        18,
        taxAmt,
        total,
        paymentMethod: PaymentMethod.UPI,
        status:        "COMPLETED",
        createdAt:     t.date,
        items: {
          create: t.items.map(i => ({
            productId: i.sk ? PN[i.sk] : null,
            serviceId: i.sk ? null : SN[i.sn],
            name:      i.sn,
            unitPrice: i.up,
            quantity:  i.qty,
            lineTotal: i.up * i.qty,
          })),
        },
      },
    });
  }
  console.log(`✅ ${txns.length} transactions seeded`);
  console.log("\n🎉 Database seeded successfully!");
  console.log("   Admin: admin@wyapar.com / Admin@123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
