import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, notFoundResponse, handleApiError, calculateStockStatus,
} from "@/lib/api";
import { UpdateProductSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

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

    // Log expense if stock was manually increased
    if (data.stock !== undefined && data.stock > existing.stock) {
      const stockAdded = data.stock - existing.stock;
      const costPriceVal = data.costPrice ?? (existing.costPrice ? Number(existing.costPrice) : 0);
      const expenseAmt = stockAdded * costPriceVal;
      if (expenseAmt > 0) {
        await prisma.expense.create({
          data: {
            title: `Restock: ${product.name} (x${stockAdded})`,
            amount: expenseAmt,
            category: "PRODUCT_PURCHASE",
            type: "BILL",
            notes: `Manually restocked via product edit. SKU: ${product.sku}`,
          },
        });
      }
    }

    revalidateDashboardAndAnalytics();

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

    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Product deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
