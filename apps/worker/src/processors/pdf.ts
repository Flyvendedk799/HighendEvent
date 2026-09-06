import type { Job } from "bullmq";
import type { PdfJobData } from "../queues.js";

export async function processPdf(job: Job<PdfJobData>): Promise<{ ok: true }> {
  console.log(
    `[pdf] job=${job.id} kind=${job.data.kind} bookingId=${job.data.bookingId} tenantId=${job.data.tenantId}`,
  );
  // Stub: generate invoice/receipt PDF and store in object storage.
  return { ok: true };
}
