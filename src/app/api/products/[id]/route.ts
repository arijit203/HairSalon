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
    // Log usage if stock was manually decreased
    if (data.stock !== undefined && data.stock < existing.stock) {
      const qtyDecreased = existing.stock - data.stock;
      await prisma.expense.create({
        data: {
          title: `Usage: ${product.name} (x${qtyDecreased})`,
          amount: 0,
          category: "PRODUCT_USAGE",
          type: "MISC",
          notes: "Manual stock decrement by staff.",
        },
      });
    }
    // Log expense if stock was manually increased (restocked)
    if (data.stock !== undefined && data.stock > existing.stock) {
      const qtyIncreased = data.stock - existing.stock;
      const costPriceVal = data.costPrice !== undefined
        ? Number(data.costPrice)
        : (existing.costPrice ? Number(existing.costPrice) : 0);
      const expenseAmt = qtyIncreased * costPriceVal;
      
      if (expenseAmt > 0) {
        await prisma.expense.create({
          data: {
            title: `Restock: ${product.name} (x${qtyIncreased})`,
            amount: expenseAmt,
            category: "PRODUCT_PURCHASE",
            type: "BILL",
            notes: "Manual stock increment by staff.",
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
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return notFoundResponse("Product");
    }

    await prisma.product.update({
      where: { id: params.id },
      data:  { isActive: false },
    });

    // Clean up associated expenses
    const expenses = await prisma.expense.findMany({
      where: { category: "PRODUCT_PURCHASE" },
    });

    for (const exp of expenses) {
      const isSinglePurchase = exp.title.includes(`Purchase: ${product.name} (x`) || exp.title.includes(`Restock: ${product.name} (x`);
      
      if (isSinglePurchase) {
        // Delete this single-item expense completely
        await prisma.expense.delete({ where: { id: exp.id } });
      } else if (exp.notes && (exp.notes.includes(product.name) || (product.sku && exp.notes.includes(product.sku)))) {
        // Multi-item expense. Adjust the notes and amount.
        const notesLines = exp.notes.split("\n");
        let itemFound = false;
        let deductedAmount = 0;
        const updatedLines = notesLines.filter(line => {
          const matchesItem = line.trim().startsWith("- ") && (line.includes(product.name) || (product.sku && line.includes(product.sku)));
          if (matchesItem) {
            itemFound = true;
            const totalMatch = line.match(/Total:\s*₹?([0-9.]+)/i) || line.match(/₹([0-9.]+)/);
            if (totalMatch && totalMatch[1]) {
              deductedAmount += parseFloat(totalMatch[1]);
            }
            return false;
          }
          return true;
        });

        if (itemFound) {
          const newAmount = Math.max(0, Number(exp.amount) - deductedAmount);
          const remainingItemsCount = updatedLines.filter(line => line.trim().startsWith("- ")).length;

          if (remainingItemsCount === 0 || newAmount <= 0) {
            await prisma.expense.delete({ where: { id: exp.id } });
          } else {
            let newTitle = exp.title;
            const titleCountMatch = exp.title.match(/(\d+) items/);
            if (titleCountMatch) {
              newTitle = exp.title.replace(`${titleCountMatch[1]} items`, `${remainingItemsCount} items`);
            }
            await prisma.expense.update({
              where: { id: exp.id },
              data: {
                amount: newAmount,
                notes: updatedLines.join("\n"),
                title: newTitle,
              }
            });
          }
        }
      }
    }

    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Product deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
