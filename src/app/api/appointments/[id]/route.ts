import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateAppointmentSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

type Params = { params: { id: string } };

// GET /api/appointments/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        client:  true,
        service: true,
        staff:   { select: { id: true, name: true, role: true, phone: true } },
      },
    });
    if (!appointment) return notFoundResponse("Appointment");
    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/appointments/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateAppointmentSchema.parse(body);

    const oldAppointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: { clientId: true },
    });

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data:  {
        ...data,
        ...(data.date && { date: new Date(data.date) }),
      },
      include: {
        client:  { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        staff:   { select: { id: true, name: true } },
      },
    });

    revalidateDashboardAndAnalytics();

    const targetClientId = appointment.clientId || oldAppointment?.clientId;
    if (targetClientId) {
      const apptsAggregate = await prisma.appointment.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED" },
        _count: { _all: true },
        _sum: { price: true },
      });

      const txAggregate = await prisma.transaction.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED" },
        _sum: { total: true },
      });

      const standaloneApptSum = await prisma.appointment.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED", transactionId: null },
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
        where: { id: targetClientId },
        data: {
          totalSpent,
          totalVisits: visits,
          loyaltyPoints,
          tier,
        },
      });
    }

    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/appointments/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const targetClientId = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: params.id },
        select: { transactionId: true, clientId: true },
      });

      await tx.appointment.delete({
        where: { id: params.id },
      });

      if (appointment?.transactionId) {
        const count = await tx.appointment.count({
          where: { transactionId: appointment.transactionId },
        });

        if (count === 0) {
          await tx.transaction.delete({
            where: { id: appointment.transactionId },
          });
        }
      }
      return appointment?.clientId;
    });

    revalidateDashboardAndAnalytics();

    if (targetClientId) {
      const apptsAggregate = await prisma.appointment.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED" },
        _count: { _all: true },
        _sum: { price: true },
      });

      const txAggregate = await prisma.transaction.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED" },
        _sum: { total: true },
      });

      const standaloneApptSum = await prisma.appointment.aggregate({
        where: { clientId: targetClientId, status: "COMPLETED", transactionId: null },
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
        where: { id: targetClientId },
        data: {
          totalSpent,
          totalVisits: visits,
          loyaltyPoints,
          tier,
        },
      });
    }

    return successResponse({ message: "Appointment deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
