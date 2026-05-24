import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, notFoundResponse, handleApiError } from "@/lib/api";
import { UpdateServiceSchema } from "@/lib/validations";

type Params = { params: { id: string } };

// GET /api/services/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        staffServices: {
          include: { staff: { select: { id: true, name: true, role: true, imageUrl: true } } },
        },
        appointments: { select: { clientId: true } },
      },
    });
    if (!service) return notFoundResponse("Service");
    return successResponse(service);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/services/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { staffIds, ...data } = UpdateServiceSchema.parse(body);

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...data,
        // Replace staff assignments if provided
        ...(staffIds !== undefined && {
          staffServices: {
            deleteMany: {},
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

    return successResponse(service);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/services/:id  (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.service.update({
      where: { id: params.id },
      data:  { isActive: false },
    });
    return successResponse({ message: "Service deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
