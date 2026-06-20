import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateAppointmentSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";
import { updateClientStats } from "@/lib/client-stats";

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
      await updateClientStats(targetClientId);
    }
    if (oldAppointment?.clientId && oldAppointment.clientId !== appointment.clientId) {
      await updateClientStats(oldAppointment.clientId);
    }

    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}


// DELETE /api/appointments/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: params.id },
        select: { transactionId: true, clientId: true },
      });

      if (!appointment) return null;

      await tx.appointment.delete({
        where: { id: params.id },
      });

      return {
        clientId: appointment.clientId,
        transactionId: appointment.transactionId,
      };
    });

    if (!result) return notFoundResponse("Appointment");

    // Clean up orphaned transactions outside the transaction lock to handle concurrent requests cleanly
    if (result.transactionId) {
      await prisma.transaction.deleteMany({
        where: {
          id: result.transactionId,
          appointments: {
            none: {},
          },
        },
      });
    }

    revalidateDashboardAndAnalytics();

    if (result.clientId) {
      await updateClientStats(result.clientId);
    }

    return successResponse({ message: "Appointment deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

