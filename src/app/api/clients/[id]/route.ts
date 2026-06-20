import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateClientSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";
import { updateClientStats } from "@/lib/client-stats";


type Params = { params: { id: string } };

// GET /api/clients/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await updateClientStats(params.id);


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
