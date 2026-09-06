import type { Job } from "bullmq";
import type { AvailabilityReindexJobData } from "../queues.js";

export async function processAvailabilityReindex(
  job: Job<AvailabilityReindexJobData>,
): Promise<{ ok: true }> {
  console.log(
    `[availability-reindex] job=${job.id} tenantId=${job.data.tenantId} productId=${job.data.productId ?? "all"}`,
  );
  // Stub: rebuild availability projection / cache for a tenant or product.
  return { ok: true };
}
