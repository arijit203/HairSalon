import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse, createdResponse, handleApiError,
  getPaginationParams, paginatedResponse,
} from "@/lib/api";
import { CreateExpenseSchema } from "@/lib/validations";
import { revalidateDashboardAndAnalytics } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

// GET /api/expenses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const category = searchParams.get("category") ?? undefined;
    const type     = searchParams.get("type")     ?? undefined;
    const search   = searchParams.get("search")   ?? undefined;

    const where = {
      ...(category && { category }),
      ...(type     && { type }),
      ...(search   && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { notes: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    return paginatedResponse(expenses, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateExpenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        title:    data.title,
        amount:   data.amount,
        category: data.category,
        type:     data.type,
        date:     data.date ? new Date(data.date) : new Date(),
        notes:    data.notes,
      },
    });

    revalidateDashboardAndAnalytics();

    return createdResponse(expense);
  } catch (error) {
    return handleApiError(error);
  }
}
