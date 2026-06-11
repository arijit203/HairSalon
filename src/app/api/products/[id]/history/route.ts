import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError, notFoundResponse } from "@/lib/api";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return notFoundResponse("Product");
    }

    // 1. Fetch sales transactions (decrements)
    const saleItems = await prisma.transactionItem.findMany({
      where: { productId: params.id, transaction: { status: "COMPLETED" } },
      include: { transaction: { select: { createdAt: true, invoiceNumber: true } } },
    });

    // 2. Fetch purchase/restock and usage expenses
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { category: "PRODUCT_PURCHASE" },
          { category: "PRODUCT_USAGE" }
        ]
      },
      orderBy: { date: "desc" }
    });

    const history: {
      date: Date;
      type: "PURCHASE" | "SALE" | "USAGE";
      qtyChange: number;
      notes: string;
    }[] = [];

    // Process Sales
    for (const item of saleItems) {
      history.push({
        date: item.transaction.createdAt,
        type: "SALE",
        qtyChange: -item.quantity,
        notes: `POS Sale (Invoice #${item.transaction.invoiceNumber})`,
      });
    }

    // Process Expenses (Purchases & Usages)
    for (const exp of expenses) {
      // Single Purchase/Restock
      const singleMatch = exp.title.match(/^(Purchase|Restock):\s*(.+?)\s*\(x(\d+)\)$/i);
      if (singleMatch && singleMatch[2].trim().toLowerCase() === product.name.toLowerCase()) {
        history.push({
          date: exp.date,
          type: "PURCHASE",
          qtyChange: parseInt(singleMatch[3], 10),
          notes: exp.notes || exp.title,
        });
      }
      // Multi-item Invoice Scan
      else if (exp.notes && exp.category === "PRODUCT_PURCHASE") {
        const lines = exp.notes.split("\n");
        for (const line of lines) {
          const lineMatch = line.trim().match(/^-\s*(.+?)\s*\(x(\d+)\)/);
          if (lineMatch && lineMatch[1].trim().toLowerCase() === product.name.toLowerCase()) {
            history.push({
              date: exp.date,
              type: "PURCHASE",
              qtyChange: parseInt(lineMatch[2], 10),
              notes: `Invoice Scanner upload`,
            });
          }
        }
      }
      // Manual Usage/Decrement
      else if (exp.category === "PRODUCT_USAGE") {
        const usageMatch = exp.title.match(/^Usage:\s*(.+?)\s*\(x(\d+)\)$/i);
        if (usageMatch && usageMatch[1].trim().toLowerCase() === product.name.toLowerCase()) {
          history.push({
            date: exp.date,
            type: "USAGE",
            qtyChange: -parseInt(usageMatch[2], 10),
            notes: exp.notes || `Manual decrement`,
          });
        }
      }
    }

    // Sort history by date descending
    history.sort((a, b) => b.date.getTime() - a.date.getTime());

    return successResponse(history);
  } catch (error) {
    return handleApiError(error);
  }
}
