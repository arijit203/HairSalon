import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse,
} from "@/lib/api";
import { CreateClientSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

export const dynamic = "force-dynamic";


// GET /api/clients
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const search = searchParams.get("search") ?? undefined;
    const tier   = searchParams.get("tier")   ?? undefined;

    const where = {
      isActive: true,
      ...(tier   && { tier: tier as any }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Client stats are synchronized dynamically during write operations (appointment create, update, delete) and on-demand during client details load.

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { totalSpent: "desc" },
        include: {
          _count: { select: { appointments: true, transactions: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return paginatedResponse(clients, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateClientSchema.parse(body);

    const client = await prisma.client.create({ data });

    revalidateDashboardAndAnalytics();

    return createdResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}
