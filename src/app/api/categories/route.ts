import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// DELETE /api/categories?category=CategoryName
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category");

    if (!category) {
      return errorResponse("Category parameter is required", 400);
    }

    // Perform database operations in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Soft delete all active services under this category
      await tx.service.updateMany({
        where: { category, isActive: true },
        data: { isActive: false },
      });

      // 2. Find all active products associated with this category
      const products = await tx.product.findMany({
        where: { category: { has: category }, isActive: true },
      });

      // 3. For each associated product, remove the category and soft-delete it
      for (const product of products) {
        const updatedCategories = product.category.filter((c) => c !== category);
        await tx.product.update({
          where: { id: product.id },
          data: {
            category: updatedCategories,
            isActive: false,
          },
        });
      }
    });

    return successResponse({ message: `Category '${category}' deleted successfully along with its services and products.` });
  } catch (error) {
    return handleApiError(error);
  }
}
