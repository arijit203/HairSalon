import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse,
  generateInvoiceNumber, calculateClientTier,
} from "@/lib/api";
import { CreateTransactionSchema } from "@/lib/validations";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";


// GET /api/transactions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const from   = searchParams.get("from")   ?? undefined;
    const to     = searchParams.get("to")     ?? undefined;
    const method = searchParams.get("method") ?? undefined;

    const where = {
      ...(method && { paymentMethod: method as any }),
      ...(from && to && {
        createdAt: { gte: new Date(from), lte: new Date(to) },
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          items:  { include: { product: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginatedResponse(transactions, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/transactions  — Full checkout in one atomic transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateTransactionSchema.parse(body);

    // ── 1. Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      subtotal += item.unitPrice * item.quantity;
    }

    const discountPct  = data.discountPct ?? 0;
    const discountAmt  = Math.round(subtotal * discountPct / 100 * 100) / 100;
    const taxableAmt   = subtotal - discountAmt;
    const taxPct       = 18; // GST
    const taxAmt       = Math.round(taxableAmt * taxPct / 100 * 100) / 100;
    const total        = taxableAmt + taxAmt;

    // ── 2. Run everything in one DB transaction
    const result = await prisma.$transaction(async (tx) => {

      // ── 2a. Decrement product stock for product items
      for (const item of data.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, lowStockAt: true },
          });

          if (!product) throw new Error(`Product ${item.productId} not found`);
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }

          const newStock = product.stock - item.quantity;
          const newStatus = newStock === 0
            ? "OUT_OF_STOCK"
            : newStock <= product.lowStockAt
            ? "LOW_STOCK"
            : "IN_STOCK";

          await tx.product.update({
            where: { id: item.productId },
            data:  { stock: newStock, status: newStatus as any },
          });
        }
      }

      // ── 2b. Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          clientId:      data.clientId,
          subtotal,
          discountPct,
          discountAmt,
          taxPct,
          taxAmt,
          total,
          paymentMethod: data.paymentMethod,
          notes:         data.notes,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              serviceId: item.serviceId,
              name:      item.name,
              unitPrice: item.unitPrice,
              quantity:  item.quantity,
              lineTotal: item.unitPrice * item.quantity,
            })),
          },
          ...(data.appointmentIds?.length && {
            appointments: {
              connect: data.appointmentIds.map((id) => ({ id })),
            },
          }),
        },
        include: {
          items:  true,
          client: { select: { id: true, name: true } },
        },
      });

      // ── 2c. Update client stats & tier
      if (data.clientId) {
        const client = await tx.client.findUnique({
          where: { id: data.clientId },
          select: { totalSpent: true, totalVisits: true },
        });

        if (client) {
          const newTotalSpent   = Number(client.totalSpent) + total;
          const newTotalVisits  = client.totalVisits + 1;
          const newLoyaltyPts   = Math.floor(total / 100); // 1 point per ₹100
          const newTier         = calculateClientTier(newTotalSpent);

          await tx.client.update({
            where: { id: data.clientId },
            data: {
              totalSpent:    newTotalSpent,
              totalVisits:   newTotalVisits,
              tier:          newTier,
              loyaltyPoints: { increment: newLoyaltyPts },
            },
          });
        }
      }

      // ── 2d. Mark linked appointments as COMPLETED
      if (data.appointmentIds?.length) {
        await tx.appointment.updateMany({
          where: { id: { in: data.appointmentIds } },
          data:  { status: "COMPLETED" },
        });
      }

      return transaction;
    });

    return createdResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
