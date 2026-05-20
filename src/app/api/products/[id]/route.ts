import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, notFoundResponse, handleApiError, calculateStockStatus,
} from "@/lib/api";
import { UpdateProductSchema } from "@/lib/validations";

type Params = { params: { id: string } };

// GET /api/products/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!product) return notFoundResponse("Product");
    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/products/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body   = await req.json();
    const data   = UpdateProductSchema.parse(body);

    // Recalculate status if stock or threshold changed
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return notFoundResponse("Product");

    const newStock     = data.stock     ?? Number(existing.stock);
    const newLowStock  = data.lowStockAt ?? existing.lowStockAt;
    const status       = calculateStockStatus(newStock, newLowStock) as any;

    const product = await prisma.product.update({
      where: { id: params.id },
      data:  { ...data, status },
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/products/:id  (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.product.update({
      where: { id: params.id },
      data:  { isActive: false },
    });
    return successResponse({ message: "Product deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
