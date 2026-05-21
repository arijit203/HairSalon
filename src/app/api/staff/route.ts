import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse,
} from "@/lib/api";
import { CreateStaffSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";


// GET /api/staff
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where = {
      isActive: true,
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, status: true, bio: true, imageUrl: true,
          joinDate: true, createdAt: true,
          staffServices: {
            include: { service: { select: { id: true, name: true } } },
          },
          _count: { select: { appointments: true } },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    return paginatedResponse(staff, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/staff
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceIds, password, ...data } = CreateStaffSchema.parse(body);

    const passwordHash = await bcrypt.hash(password, 12);

    const staff = await prisma.staff.create({
      data: {
        ...data,
        passwordHash,
        ...(serviceIds?.length && {
          staffServices: {
            create: serviceIds.map((serviceId) => ({ serviceId })),
          },
        }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, status: true, joinDate: true,
      },
    });

    return createdResponse(staff);
  } catch (error) {
    return handleApiError(error);
  }
}
