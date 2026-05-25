import { revalidateTag } from "next/cache";

/**
 * Revalidates the cached keys for dashboard stats and analytics.
 * This should be called whenever DB writes happen that change
 * stats (e.g. appointments, transactions, clients, products).
 */
export function revalidateDashboardAndAnalytics() {
  try {
    revalidateTag("dashboard-stats");
    revalidateTag("analytics");
  } catch (error) {
    console.error("Cache revalidation error:", error);
  }
}
