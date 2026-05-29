import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError, notFoundResponse } from "@/lib/api";
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

    await prisma.expense.delete({
      where: { id: params.id },
    });

    revalidateDashboardAndAnalytics();

    return successResponse({ message: "Expense deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
