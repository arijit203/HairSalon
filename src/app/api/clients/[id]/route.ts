import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateClientSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

type Params = { params: { id: string } };

// GET /api/clients/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const apptsAggregate = await prisma.appointment.aggregate({
      where: { clientId: params.id, status: "COMPLETED" },
      _count: { _all: true },
      _sum: { price: true },
    });

    const txAggregate = await prisma.transaction.aggregate({
      where: { clientId: params.id, status: "COMPLETED" },
      _sum: { total: true },
    });

    const standaloneApptSum = await prisma.appointment.aggregate({
      where: { clientId: params.id, status: "COMPLETED", transactionId: null },
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
      where: { id: params.id },
      data: {
        totalSpent,
        totalVisits: visits,
        loyaltyPoints,
        tier,
      },
    });

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        appointments: {
          take: 100,
          orderBy: { date: "desc" },
          include: {
            service: { select: { id: true, name: true, price: true } },
            staff:   { select: { id: true, name: true } },
          },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, invoiceNumber: true, total: true,
            paymentMethod: true, createdAt: true,
          },
        },
        _count: { select: { appointments: true, transactions: true } },
      },
    });

    if (!client) return notFoundResponse("Client");
    return successResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/clients/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateClientSchema.parse(body);

    const client = await prisma.client.update({
      where: { id: params.id },
      data,
    });

    revalidateDashboardAndAnalytics();

    return successResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clients/:id  (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.client.update({
      where: { id: params.id },
      data:  { isActive: false },
    });

    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Client removed successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
