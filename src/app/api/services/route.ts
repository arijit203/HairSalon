import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse,
} from "@/lib/api";
import { CreateServiceSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";


// GET /api/services
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const category  = searchParams.get("category")  ?? undefined;
    const search    = searchParams.get("search")    ?? undefined;
    const isPopular = searchParams.get("popular") === "true" ? true : undefined;

    const where = {
      isActive: true,
      ...(category  && { category }),
      ...(isPopular !== undefined && { isPopular }),
      ...(search    && {
        OR: [
          { name:        { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          staffServices: {
            include: { staff: { select: { id: true, name: true, role: true } } },
          },
          appointments: { select: { clientId: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    return paginatedResponse(services, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/services
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffIds, ...data } = CreateServiceSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        ...data,
        ...(staffIds?.length && {
          staffServices: {
            create: staffIds.map((staffId) => ({ staffId })),
          },
        }),
      },
      include: {
        staffServices: {
          include: { staff: { select: { id: true, name: true } } },
        },
      },
    });

    return createdResponse(service);
  } catch (error) {
    return handleApiError(error);
  }
}
