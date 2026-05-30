import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateStaffSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

type Params = { params: { id: string } };

// GET /api/staff/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, status: true, bio: true, imageUrl: true,
        joinDate: true, createdAt: true,
        staffServices: {
          include: { service: { select: { id: true, name: true, category: true } } },
        },
        appointments: {
          take: 100,
          orderBy: { date: "desc" },
          include: {
            client:  { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
        _count: { select: { appointments: true } },
      },
    });

    if (!staff) return notFoundResponse("Staff member");
    return successResponse(staff);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/staff/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { serviceIds, password, ...data } = UpdateStaffSchema.parse(body);

    const updateData: any = { ...data };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: {
        ...updateData,
        ...(serviceIds !== undefined && {
          staffServices: {
            deleteMany: {},
            create: serviceIds.map((serviceId) => ({ serviceId })),
          },
        }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, status: true, joinDate: true,
      },
    });

    return successResponse(staff);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/staff/:id  (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.staff.update({
      where: { id: params.id },
      data:  { isActive: false, status: "INACTIVE" },
    });
    return successResponse({ message: "Staff member removed successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
