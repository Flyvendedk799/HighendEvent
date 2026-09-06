import type { Job } from "bullmq";
import type { StripeSyncJobData } from "../queues.js";

export async function processStripeSync(job: Job<StripeSyncJobData>): Promise<{ ok: true }> {
  console.log(
    `[stripe-sync] job=${job.id} tenantId=${job.data.tenantId} accountId=${job.data.accountId ?? "n/a"} reason=${job.data.reason ?? "manual"}`,
  );
  // Stub: refresh Connect account / subscription state from Stripe.
  return { ok: true };
}
