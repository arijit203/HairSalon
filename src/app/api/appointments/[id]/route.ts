import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateAppointmentSchema } from "@/lib/validations";

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

    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/appointments/:id  (cancel)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.appointment.update({
      where: { id: params.id },
      data:  { status: "CANCELLED" },
    });
    return successResponse({ message: "Appointment cancelled" });
  } catch (error) {
    return handleApiError(error);
  }
}
