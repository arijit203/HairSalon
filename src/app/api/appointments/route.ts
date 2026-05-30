import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse, calculateEndTime, calculateStartTime,
  generateInvoiceNumber,
} from "@/lib/api";
import { CreateAppointmentSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

export const dynamic = "force-dynamic";


// GET /api/appointments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const date = searchParams.get("date") ?? undefined; // YYYY-MM-DD
    const staffId = searchParams.get("staffId") ?? undefined;
    const clientId = searchParams.get("clientId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const where = {
      ...(status && { status: status as any }),
      ...(staffId && { staffId }),
      ...(clientId && { clientId }),
      ...(date && { date: new Date(date) }),
      ...(from && to && {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      }),
    };

    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: sortOrder }, { startTime: sortOrder }],
        include: {
          client: { select: { id: true, name: true, phone: true, email: true } },
          service: { select: { id: true, name: true, category: true, price: true } },
          staff: { select: { id: true, name: true, role: true } },
          transaction: {
            include: {
              items: true,
            }
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return paginatedResponse(appointments, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deleteAppointmentIds, ...data } = CreateAppointmentSchema.parse(body);

    const isProductSale = data.productIds && data.productIds.length > 0;

    if (isProductSale) {
      const productIds = data.productIds!;
      const uniqueProductIds = Array.from(new Set(productIds));
      const products = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        select: { id: true, name: true, price: true, stock: true },
      });

      if (products.length !== uniqueProductIds.length) {
        return handleApiError(new Error("Some products not found"));
      }

      // Count quantity requested for each product ID
      const productCounts: Record<string, number> = {};
      productIds.forEach(id => {
        productCounts[id] = (productCounts[id] || 0) + 1;
      });

      // Verify stock availability
      for (const prod of products) {
        const reqQty = productCounts[prod.id] || 0;
        if (prod.stock < reqQty) {
          return handleApiError(new Error(`Product "${prod.name}" is out of stock (available: ${prod.stock}, requested: ${reqQty})`));
        }
      }

      // Resolve/upsert the "Product Sale" dummy service
      let productSaleService = await prisma.service.findFirst({
        where: { name: "Product Sale", category: "Retail" },
      });
      if (!productSaleService) {
        productSaleService = await prisma.service.create({
          data: {
            name: "Product Sale",
            category: "Retail",
            price: 0,
            isPopular: false,
            isActive: true,
          },
        });
      }

      const productMap = new Map(products.map(p => [p.id, p]));
      // Build a deduplicated list of items with correct quantities
      const productItems = uniqueProductIds.map(id => {
        const prod = productMap.get(id)!;
        const qty = productCounts[id] || 1;
        return { ...prod, quantity: qty };
      });
      // Total list price = sum of (unitPrice × qty) for each unique product
      const totalListPrice = productItems.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

      const discountPct = data.discountPct ?? (totalListPrice > data.price ? Math.round(((totalListPrice - data.price) / totalListPrice) * 100) : 0);
      const discountAmt = data.discountPct !== undefined ? Math.round((totalListPrice * data.discountPct) / 100) : (totalListPrice > data.price ? totalListPrice - data.price : 0);
      const taxPct = data.taxPct ?? 0;
      const priceAfterDiscount = Math.max(0, totalListPrice - discountAmt);
      const taxAmt = Math.round((priceAfterDiscount * taxPct) / 100);

      let overallEndTime = data.endTime || "";
      if (!overallEndTime && data.startTime) overallEndTime = data.startTime;
      if (!overallEndTime) overallEndTime = "12:00";

      // Decrement product stock and create transaction & appointment inside a prisma transaction
      const transactionRecord = await prisma.$transaction(async (tx) => {
        // Decrement product stock
        await Promise.all(
          Object.entries(productCounts).map(([id, qty]) =>
            tx.product.update({
              where: { id },
              data: {
                stock: {
                  decrement: qty
                }
              }
            })
          )
        );

        // Update product statuses based on new stock levels
        await Promise.all(
          uniqueProductIds.map(async (id) => {
            const prod = await tx.product.findUnique({
              where: { id },
              select: { stock: true, lowStockAt: true }
            });
            if (prod) {
              let status = "IN_STOCK";
              if (prod.stock <= 0) {
                status = "OUT_OF_STOCK";
              } else if (prod.stock <= prod.lowStockAt) {
                status = "LOW_STOCK";
              }
              await tx.product.update({
                where: { id },
                data: { status: status as any }
              });
            }
          })
        );

        return await tx.transaction.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            clientId: data.clientId,
            subtotal: totalListPrice,
            discountPct,
            discountAmt,
            taxPct,
            taxAmt,
            total: data.price,
            paymentMethod: data.paymentMethod || "ONLINE",
            notes: data.notes,
            createdAt: new Date(`${data.date}T${overallEndTime}:00+05:30`),
            items: {
              create: productItems.map((prod) => {
                const lineTotal = totalListPrice > 0
                  ? Math.round((Number(prod.price) * prod.quantity / totalListPrice) * data.price * 100) / 100
                  : Math.round((data.price / productItems.length) * 100) / 100;
                return {
                  productId: prod.id,
                  name: prod.name,
                  unitPrice: prod.price,
                  quantity: prod.quantity,
                  lineTotal,
                };
              }),
            },
            appointments: {
              create: {
                clientId: data.clientId,
                serviceId: productSaleService!.id,
                staffId: data.staffId,
                date: new Date(data.date),
                startTime: data.startTime || "12:00",
                endTime: overallEndTime,
                status: "COMPLETED",
                price: data.price,
                notes: data.notes,
              }
            }
          },
          include: {
            items: true,
            appointments: {
              include: {
                client: { select: { id: true, name: true, phone: true } },
                service: { select: { id: true, name: true, price: true } },
                staff: { select: { id: true, name: true } },
              }
            }
          }
        });
      });

      revalidateDashboardAndAnalytics();

      if (data.clientId) {
        const apptsAggregate = await prisma.appointment.aggregate({
          where: { clientId: data.clientId, status: "COMPLETED" },
          _count: { _all: true },
          _sum: { price: true },
        });

        const txAggregate = await prisma.transaction.aggregate({
          where: { clientId: data.clientId, status: "COMPLETED" },
          _sum: { total: true },
        });

        const standaloneApptSum = await prisma.appointment.aggregate({
          where: { clientId: data.clientId, status: "COMPLETED", transactionId: null },
          _sum: { price: true },
        });

        const visits = apptsAggregate._count._all || 0;
        const totalSpent = Number(txAggregate._sum.total || 0) + Number(standaloneApptSum._sum.price || 0);
        const loyaltyPoints = Math.floor(totalSpent / 100);

        let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
        if (totalSpent >= 50000) tier = "PLATINUM";
        else if (totalSpent >= 25000) tier = "GOLD";
        else if (totalSpent >= 10000) tier = "SILVER";

        await prisma.client.update({
          where: { id: data.clientId },
          data: {
            totalSpent,
            totalVisits: visits,
            loyaltyPoints,
            tier,
          },
        });
      }

      const createdAppt = transactionRecord.appointments[0];
      const responseData = {
        ...createdAppt,
        transaction: transactionRecord,
      };

      return createdResponse(responseData);
    }

    const serviceIds = data.serviceIds && data.serviceIds.length > 0
      ? data.serviceIds
      : [data.serviceId!];

    // Fetch service prices to compute price allocation
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, price: true },
    });

    if (services.length !== serviceIds.length) {
      return handleApiError(new Error("Some services not found"));
    }

    // Map by ID to preserve the order in serviceIds
    const serviceMap = new Map(services.map(s => [s.id, s]));
    const orderedServices = serviceIds.map(id => serviceMap.get(id)!);

    // Sum of list prices
    const totalListPrice = orderedServices.reduce((sum, s) => sum + Number(s.price), 0);

    let overallStartTime = data.startTime || "";
    let overallEndTime = data.endTime || "";

    // Determine status first
    const localToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in IST
    const isToday = data.date === localToday;

    // We temp-check if overallEndTime is provided to auto-complete status
    let defaultStatus: "PENDING" | "COMPLETED" = "PENDING";
    if (isToday && overallEndTime) {
      try {
        const appointmentEndDateTime = new Date(`${data.date}T${overallEndTime}:00+05:30`);
        if (Date.now() > appointmentEndDateTime.getTime()) {
          defaultStatus = "COMPLETED";
        }
      } catch (e) {
        // ignore
      }
    }
    const status = data.status || defaultStatus;

    // Simple start/end time fallback since duration is removed
    if (overallEndTime && !overallStartTime) {
      overallStartTime = overallEndTime;
    } else if (overallStartTime && !overallEndTime) {
      overallEndTime = overallStartTime;
    }

    if (!overallStartTime && !overallEndTime) {
      return handleApiError(new Error("Either startTime or endTime must be provided"));
    }

    const appointmentsData = [];

    for (let i = 0; i < orderedServices.length; i++) {
      const service = orderedServices[i];

      // Proportional price calculation
      let allocatedPrice = 0;
      if (totalListPrice > 0) {
        allocatedPrice = Math.round((Number(service.price) / totalListPrice) * data.price * 100) / 100;
      } else {
        allocatedPrice = Math.round((data.price / orderedServices.length) * 100) / 100;
      }

      appointmentsData.push({
        clientId: data.clientId,
        serviceId: service.id,
        staffId: data.staffId,
        date: new Date(data.date),
        startTime: overallStartTime,
        endTime: overallEndTime,
        status,
        price: allocatedPrice,
        notes: data.notes,
      });
    }

    const queries: any[] = [];
    let deleteCount = 0;
    if (deleteAppointmentIds && deleteAppointmentIds.length > 0) {
      const appointmentsToDelete = await prisma.appointment.findMany({
        where: { id: { in: deleteAppointmentIds } },
        select: { transactionId: true },
      });
      const txIdsToDelete = appointmentsToDelete.map(a => a.transactionId).filter(Boolean) as string[];

      queries.push(
        prisma.appointment.deleteMany({
          where: { id: { in: deleteAppointmentIds } },
        })
      );
      deleteCount++;

      if (txIdsToDelete.length > 0) {
        queries.push(
          prisma.transaction.deleteMany({
            where: { id: { in: txIdsToDelete } },
          })
        );
        deleteCount++;
      }
    }

    if (status === "COMPLETED") {
      const discountPct = data.discountPct ?? (totalListPrice > data.price ? Math.round(((totalListPrice - data.price) / totalListPrice) * 100) : 0);
      const discountAmt = data.discountPct !== undefined ? Math.round((totalListPrice * data.discountPct) / 100) : (totalListPrice > data.price ? totalListPrice - data.price : 0);
      const taxPct = data.taxPct ?? 0;
      const priceAfterDiscount = Math.max(0, totalListPrice - discountAmt);
      const taxAmt = Math.round((priceAfterDiscount * taxPct) / 100);

      queries.push(
        prisma.transaction.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            clientId: data.clientId,
            subtotal: totalListPrice,
            discountPct,
            discountAmt,
            taxPct,
            taxAmt,
            total: data.price,
            paymentMethod: data.paymentMethod || "ONLINE",
            notes: data.notes,
            createdAt: new Date(`${data.date}T${overallEndTime || "12:00"}:00+05:30`),
            items: {
              create: orderedServices.map((service) => {
                let allocatedPrice = 0;
                if (totalListPrice > 0) {
                  allocatedPrice = Math.round((Number(service.price) / totalListPrice) * data.price * 100) / 100;
                } else {
                  allocatedPrice = Math.round((data.price / orderedServices.length) * 100) / 100;
                }
                return {
                  serviceId: service.id,
                  name: service.name,
                  unitPrice: service.price,
                  quantity: 1,
                  lineTotal: allocatedPrice,
                };
              }),
            },
            appointments: {
              create: appointmentsData.map(appt => ({
                clientId: appt.clientId,
                serviceId: appt.serviceId,
                staffId: appt.staffId,
                date: appt.date,
                startTime: appt.startTime,
                endTime: appt.endTime,
                status: appt.status,
                price: appt.price,
                notes: appt.notes,
              })),
            },
          },
          include: {
            appointments: {
              include: {
                client: { select: { id: true, name: true, phone: true } },
                service: { select: { id: true, name: true, price: true } },
                staff: { select: { id: true, name: true } },
              }
            }
          }
        })
      );
    } else {
      appointmentsData.forEach(appt => {
        queries.push(
          prisma.appointment.create({
            data: appt,
            include: {
              client: { select: { id: true, name: true, phone: true } },
              service: { select: { id: true, name: true, price: true } },
              staff: { select: { id: true, name: true } },
              transaction: true,
            }
          })
        );
      });
    }

    // Run in a prisma transaction to ensure atomic creation/deletion
    const transactionResult = await prisma.$transaction(queries);
    const createdAppointments = transactionResult.slice(deleteCount);

    // Return the first created appointment
    const responseData = status === "COMPLETED"
      ? (createdAppointments[0] as any).appointments[0]
      : createdAppointments[0];

    // Revalidate stats & charts cache
    revalidateDashboardAndAnalytics();

    if (data.clientId) {
      const apptsAggregate = await prisma.appointment.aggregate({
        where: { clientId: data.clientId, status: "COMPLETED" },
        _count: { _all: true },
        _sum: { price: true },
      });

      const txAggregate = await prisma.transaction.aggregate({
        where: { clientId: data.clientId, status: "COMPLETED" },
        _sum: { total: true },
      });

      const standaloneApptSum = await prisma.appointment.aggregate({
        where: { clientId: data.clientId, status: "COMPLETED", transactionId: null },
        _sum: { price: true },
      });

      const visits = apptsAggregate._count._all || 0;
      const totalSpent = Number(txAggregate._sum.total || 0) + Number(standaloneApptSum._sum.price || 0);
      const loyaltyPoints = Math.floor(totalSpent / 100);

      let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
      if (totalSpent >= 50000) tier = "PLATINUM";
      else if (totalSpent >= 25000) tier = "GOLD";
      else if (totalSpent >= 10000) tier = "SILVER";

      await prisma.client.update({
        where: { id: data.clientId },
        data: {
          totalSpent,
          totalVisits: visits,
          loyaltyPoints,
          tier,
        },
      });
    }

    return createdResponse(responseData);
  } catch (error) {
    return handleApiError(error);
  }
}
