import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse, calculateStockStatus,
} from "@/lib/api";
import { CreateProductSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";


// GET /api/products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const category = searchParams.get("category") ?? undefined;
    const status   = searchParams.get("status")   ?? undefined;
    const search   = searchParams.get("search")   ?? undefined;

    const where = {
      isActive:  true,
      ...(category && { category }),
      ...(status   && { status: status as any }),
      ...(search   && {
        OR: [
          { name:  { contains: search, mode: "insensitive" as const } },
          { brand: { contains: search, mode: "insensitive" as const } },
          { sku:   { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return paginatedResponse(products, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateProductSchema.parse(body);

    const status = calculateStockStatus(data.stock, data.lowStockAt) as any;

    const product = await prisma.product.create({
      data: {
        ...data,
        price:     data.price,
        costPrice: data.costPrice,
        status,
      },
    });

    return createdResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
