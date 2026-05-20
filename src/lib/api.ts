import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// ─── Standardised API response shapes ────────────────────────────────────────

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T) {
  return successResponse(data, 201);
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

// ─── Global error handler ─────────────────────────────────────────────────────

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      "Validation failed",
      422,
      error.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
    );
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const field = (error.meta?.target as string[])?.join(", ") ?? "field";
        return errorResponse(`A record with this ${field} already exists.`, 409);
      }
      case "P2025":
        return notFoundResponse();
      case "P2003":
        return errorResponse("Related record not found (foreign key violation).", 400);
      default:
        return errorResponse(`Database error: ${error.code}`, 500);
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse("An unexpected error occurred", 500);
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

export function getPaginationParams(searchParams: URLSearchParams) {
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

// ─── Invoice number generator ─────────────────────────────────────────────────

export function generateInvoiceNumber(): string {
  const now    = new Date();
  const year   = now.getFullYear().toString().slice(-2);
  const month  = String(now.getMonth() + 1).padStart(2, "0");
  const day    = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `WYP-${year}${month}${day}-${random}`;
}

// ─── Stock status calculator ──────────────────────────────────────────────────

export function calculateStockStatus(stock: number, lowStockAt: number) {
  if (stock === 0) return "OUT_OF_STOCK";
  if (stock <= lowStockAt) return "LOW_STOCK";
  return "IN_STOCK";
}

// ─── Client tier calculator ───────────────────────────────────────────────────

export function calculateClientTier(totalSpent: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" {
  if (totalSpent >= 50000) return "PLATINUM";
  if (totalSpent >= 25000) return "GOLD";
  if (totalSpent >= 10000) return "SILVER";
  return "BRONZE";
}

// ─── Appointment end-time calculator ─────────────────────────────────────────

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes     = hours * 60 + minutes + durationMinutes;
  const endHours         = Math.floor(totalMinutes / 60) % 24;
  const endMins          = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
}
