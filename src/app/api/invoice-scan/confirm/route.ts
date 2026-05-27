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

          const updateData: any = {
            stock: newStock,
            status,
          };

          if (item.costPrice !== undefined) {
            updateData.costPrice = item.costPrice;
          } else if (item.unitPrice > 0) {
            updateData.costPrice = item.unitPrice;
          }

          if (item.salePrice !== undefined) {
            updateData.price = item.salePrice;
          }

          const updated = await prisma.product.update({
            where: { id: item.productId },
            data: updateData,
          });

          results.updated.push({
            id: updated.id,
            name: updated.name,
            addedStock: item.quantity,
            newStock,
          });
        } else {
          // Create new product
          const sku = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
            },
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
