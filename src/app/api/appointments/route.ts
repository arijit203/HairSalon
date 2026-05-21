import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse, calculateEndTime, calculateStartTime,
} from "@/lib/api";
import { CreateAppointmentSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";


// GET /api/appointments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

        const date     = searchParams.get("date")     ?? undefined; // YYYY-MM-DD
    const staffId  = searchParams.get("staffId")  ?? undefined;
    const clientId = searchParams.get("clientId") ?? undefined;
    const status   = searchParams.get("status")   ?? undefined;
    const from     = searchParams.get("from")     ?? undefined;
    const to       = searchParams.get("to")       ?? undefined;

    const where = {
      ...(status   && { status: status as any }),
      ...(staffId  && { staffId }),
      ...(clientId && { clientId }),
      ...(date     && { date: new Date(date) }),
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
          client:  { select: { id: true, name: true, phone: true, email: true } },
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
    const { deleteAppointmentIds, ...data } = CreateAppointmentSchema.parse(body);

    const serviceIds = data.serviceIds && data.serviceIds.length > 0
      ? data.serviceIds
      : [data.serviceId!];

    // Fetch service durations and prices to compute end times and price allocation
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, duration: true, price: true },
    });

    if (services.length !== serviceIds.length) {
      return handleApiError(new Error("Some services not found"));
    }

    // Map by ID to preserve the order in serviceIds
    const serviceMap = new Map(services.map(s => [s.id, s]));
    const orderedServices = serviceIds.map(id => serviceMap.get(id)!);

    // Sum of list prices
    const totalListPrice = orderedServices.reduce((sum, s) => sum + Number(s.price), 0);

    const totalDuration = orderedServices.reduce((sum, s) => sum + s.duration, 0);
    
    let overallStartTime = data.startTime || "";
    let overallEndTime = data.endTime || "";

    if (overallStartTime && !overallEndTime) {
      overallEndTime = calculateEndTime(overallStartTime, totalDuration);
    } else if (overallEndTime && !overallStartTime) {
      overallStartTime = calculateStartTime(overallEndTime, totalDuration);
    } else if (!overallStartTime && !overallEndTime) {
      return handleApiError(new Error("Either startTime or endTime must be provided"));
    }

    // Check if the appointment start time is in the future (using local IST offset)
    const appointmentDateTime = new Date(`${data.date}T${overallStartTime}:00+05:30`);
    const isFuture = appointmentDateTime.getTime() > Date.now();
    const status = isFuture ? ("PENDING" as const) : ("CONFIRMED" as const);

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
        clientId:  data.clientId,
        serviceId: service.id,
        staffId:   data.staffId,
        date:      new Date(data.date),
        startTime: overallStartTime,
        endTime:   overallEndTime,
        status,
        price:     allocatedPrice,
        notes:     data.notes,
      });
    }

    const queries: any[] = [];
    if (deleteAppointmentIds && deleteAppointmentIds.length > 0) {
      queries.push(
        prisma.appointment.deleteMany({
          where: { id: { in: deleteAppointmentIds } },
        })
      );
    }

    appointmentsData.forEach(appt => {
      queries.push(
        prisma.appointment.create({
          data: appt,
          include: {
            client:  { select: { id: true, name: true, phone: true } },
            service: { select: { id: true, name: true, duration: true } },
            staff:   { select: { id: true, name: true } },
          }
        })
      );
    });

    // Run in a prisma transaction to ensure atomic creation/deletion
    const transactionResult = await prisma.$transaction(queries);
    const createdAppointments = deleteAppointmentIds && deleteAppointmentIds.length > 0
      ? transactionResult.slice(1)
      : transactionResult;

    // Return the first created appointment
    return createdResponse(createdAppointments[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
