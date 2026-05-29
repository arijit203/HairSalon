import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  errorResponse,
  calculateStockStatus,
} from "@/lib/api";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

interface ConfirmItem {
  action: "update" | "create";
  productId?: string;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  categories: string[];
  salePrice?: number;
  costPrice?: number;
  itemCode?: string;
  taxRate?: number;
}

// POST /api/invoice-scan/confirm — Confirm and add/update products
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as { items: ConfirmItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("No items to process", 400);
    }

    const results = {
      updated: [] as { id: string; name: string; addedStock: number; newStock: number }[],
      created: [] as { id: string; name: string; stock: number }[],
      errors: [] as { name: string; error: string }[],
    };

    const loggedItems: {
      name: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
      itemCode?: string;
      total: number;
    }[] = [];

    for (const item of items) {
      try {
        if (item.action === "update" && item.productId) {
          // Update existing product — increment stock
          const existing = await prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!existing) {
            results.errors.push({
              name: item.name,
              error: "Product not found in database",
            });
            continue;
          }

          const newStock = existing.stock + item.quantity;
          const status = calculateStockStatus(newStock, existing.lowStockAt) as any;

          // Calculate weighted average cost price
          const existingStock = existing.stock > 0 ? existing.stock : 0;
          const existingCost = existing.costPrice ? Number(existing.costPrice) : 0;
          const scannedQty = item.quantity;
          const scannedCost = item.unitPrice > 0 ? item.unitPrice : (item.costPrice || 0);

          let avgCostPrice = existingCost;
          if (existingStock + scannedQty > 0) {
            avgCostPrice = ((existingStock * existingCost) + (scannedQty * scannedCost)) / (existingStock + scannedQty);
            avgCostPrice = Math.round(avgCostPrice * 100) / 100;
          }

          const updateData: any = {
            stock: newStock,
            status,
            costPrice: avgCostPrice,
          };

          if (item.taxRate !== undefined) {
            updateData.taxRate = item.taxRate;
          }

          const updated = await prisma.product.update({
            where: { id: item.productId },
            data: updateData,
          });

          // Accumulate for single expense log
          const itemTotal = (item.quantity * item.unitPrice) * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100);
          loggedItems.push({
            name: updated.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxRate: item.taxRate || 0,
            itemCode: item.itemCode,
            total: itemTotal,
          });

          results.updated.push({
            id: updated.id,
            name: updated.name,
            addedStock: item.quantity,
            newStock,
          });
        } else {
          // Create new product
          const sku = item.itemCode && item.itemCode.trim() !== ""
            ? item.itemCode.trim()
            : `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          const status = calculateStockStatus(item.quantity, 2) as any;

          const created = await prisma.product.create({
            data: {
              name: item.name,
              brand: item.brand || "",
              category: item.categories.length > 0 ? item.categories : [],
              sku,
              price: item.salePrice !== undefined ? item.salePrice : item.unitPrice,
              costPrice: item.costPrice !== undefined ? item.costPrice : item.unitPrice,
              stock: item.quantity,
              lowStockAt: 2,
              status,
              salePriceDiscount: item.discount || 0,
              salePriceDiscountType: "PERCENTAGE",
              taxRate: item.taxRate !== undefined ? item.taxRate : 5.00,
            },
          });

          // Accumulate for single expense log
          const itemTotal = (item.quantity * item.unitPrice) * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100);
          loggedItems.push({
            name: created.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxRate: item.taxRate || 0,
            itemCode: item.itemCode,
            total: itemTotal,
          });

          results.created.push({
            id: created.id,
            name: created.name,
            stock: created.stock,
          });
        }
      } catch (err: any) {
        results.errors.push({
          name: item.name,
          error: err.message || "Unknown error",
        });
      }
    }

    // Log single aggregated expense for all scanned items
    if (loggedItems.length > 0) {
      const totalAmount = loggedItems.reduce((sum, item) => sum + item.total, 0);
      if (totalAmount > 0) {
        const notesLines = [
          `Confirmed via Invoice Scanner. Total items: ${loggedItems.length}`,
          "",
          "Items List:",
          ...loggedItems.map(item => 
            `- ${item.name} (x${item.quantity}) @ ₹${item.unitPrice.toFixed(2)} | Disc: ${item.discount}% | Tax: ${item.taxRate}% | Total: ₹${item.total.toFixed(2)}`
          )
        ];

        await prisma.expense.create({
          data: {
            title: `Invoice Scan Purchase (${loggedItems.length} items)`,
            amount: totalAmount,
            category: "PRODUCT_PURCHASE",
            type: "BILL",
            notes: notesLines.join("\n"),
          },
        });
      }
    }

    revalidateDashboardAndAnalytics();

    return successResponse({
      results,
      summary: {
        updated: results.updated.length,
        created: results.created.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
