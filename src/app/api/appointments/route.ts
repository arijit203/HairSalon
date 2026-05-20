import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse, calculateEndTime,
} from "@/lib/api";
import { CreateAppointmentSchema } from "@/lib/validations";

// GET /api/appointments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const date    = searchParams.get("date")    ?? undefined; // YYYY-MM-DD
    const staffId = searchParams.get("staffId") ?? undefined;
    const status  = searchParams.get("status")  ?? undefined;
    const from    = searchParams.get("from")    ?? undefined;
    const to      = searchParams.get("to")      ?? undefined;

    const where = {
      ...(status  && { status: status as any }),
      ...(staffId && { staffId }),
      ...(date    && { date: new Date(date) }),
      ...(from && to && {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          client:  { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true, duration: true, category: true } },
          staff:   { select: { id: true, name: true, role: true } },
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
    const data = CreateAppointmentSchema.parse(body);

    // Fetch service duration to compute end time
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { duration: true },
    });
    if (!service) {
      return handleApiError(new Error("Service not found"));
    }

    const endTime = calculateEndTime(data.startTime, service.duration);

    const appointment = await prisma.appointment.create({
      data: {
        ...data,
        date:    new Date(data.date),
        endTime,
        status:  "CONFIRMED",
      },
      include: {
        client:  { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, duration: true } },
        staff:   { select: { id: true, name: true } },
      },
    });

    return createdResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
