import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError, notFoundResponse, calculateStockStatus } from "@/lib/api";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

type Params = { params: { id: string } };

// DELETE /api/expenses/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const existing = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return notFoundResponse("Expense");
    }

    // Revert stock additions
    if (existing.category === "PRODUCT_PURCHASE") {
      // 1. Single product purchase/restock
      const singleMatch = existing.title.match(/^(Purchase|Restock):\s*(.+?)\s*\(x(\d+)\)$/i);
      if (singleMatch) {
        const productName = singleMatch[2].trim();
        const qty = parseInt(singleMatch[3], 10);
        
        if (qty > 0) {
          const product = await prisma.product.findFirst({
            where: { name: productName, isActive: true },
          });
          if (product) {
            const newStock = Math.max(0, product.stock - qty);
            const status = calculateStockStatus(newStock, product.lowStockAt) as any;
            await prisma.product.update({
              where: { id: product.id },
              data: { stock: newStock, status },
            });
          }
        }
      } 
      // 2. Multi-item invoice scan purchase
      else if (existing.notes) {
        const lines = existing.notes.split("\n");
        for (const line of lines) {
          const lineMatch = line.trim().match(/^-\s*(.+?)\s*\(x(\d+)\)/);
          if (lineMatch) {
            const productName = lineMatch[1].trim();
            const qty = parseInt(lineMatch[2], 10);
            
            if (qty > 0) {
              const product = await prisma.product.findFirst({
                where: { name: productName, isActive: true },
              });
              if (product) {
                const newStock = Math.max(0, product.stock - qty);
                const status = calculateStockStatus(newStock, product.lowStockAt) as any;
                await prisma.product.update({
                  where: { id: product.id },
                  data: { stock: newStock, status },
                });
              }
            }
          }
        }
      }
    }

    await prisma.expense.delete({
      where: { id: params.id },
    });

    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Expense deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
