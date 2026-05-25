import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse, calculateEndTime, calculateStartTime,
  generateInvoiceNumber,
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
          service: { select: { id: true, name: true, category: true, price: true } },
          staff:   { select: { id: true, name: true, role: true } },
          transaction: true,
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
      const appointmentsToDelete = await prisma.appointment.findMany({
        where: { id: { in: deleteAppointmentIds } },
        select: { transactionId: true },
      });
      const txIdsToDelete = appointmentsToDelete.map(a => a.transactionId).filter(Boolean) as string[];
      if (txIdsToDelete.length > 0) {
        queries.push(
          prisma.transaction.deleteMany({
            where: { id: { in: txIdsToDelete } },
          })
        );
      }

      queries.push(
        prisma.appointment.deleteMany({
          where: { id: { in: deleteAppointmentIds } },
        })
      );
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
            clientId:      data.clientId,
            subtotal:      totalListPrice,
            discountPct,
            discountAmt,
            taxPct,
            taxAmt,
            total:         data.price,
            paymentMethod: "CASH",
            notes:         data.notes,
            createdAt:     new Date(`${data.date}T${overallEndTime || "12:00"}:00+05:30`),
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
                  name:      service.name,
                  unitPrice: service.price,
                  quantity:  1,
                  lineTotal: allocatedPrice,
                };
              }),
            },
            appointments: {
              create: appointmentsData.map(appt => ({
                clientId:  appt.clientId,
                serviceId: appt.serviceId,
                staffId:   appt.staffId,
                date:      appt.date,
                startTime: appt.startTime,
                endTime:   appt.endTime,
                status:    appt.status,
                price:     appt.price,
                notes:     appt.notes,
              })),
            },
          },
          include: {
            appointments: {
              include: {
                client:  { select: { id: true, name: true, phone: true } },
                service: { select: { id: true, name: true, price: true } },
                staff:   { select: { id: true, name: true } },
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
              client:  { select: { id: true, name: true, phone: true } },
              service: { select: { id: true, name: true, price: true } },
              staff:   { select: { id: true, name: true } },
              transaction: true,
            }
          })
        );
      });
    }

    // Run in a prisma transaction to ensure atomic creation/deletion
    const transactionResult = await prisma.$transaction(queries);
    const createdAppointments = deleteAppointmentIds && deleteAppointmentIds.length > 0
      ? transactionResult.slice(1)
      : transactionResult;

    // Return the first created appointment
    const responseData = status === "COMPLETED"
      ? (createdAppointments[0] as any).appointments[0]
      : createdAppointments[0];

    return createdResponse(responseData);
  } catch (error) {
    return handleApiError(error);
  }
}
