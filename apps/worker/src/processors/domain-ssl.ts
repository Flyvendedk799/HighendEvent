import type { Job } from "bullmq";
import type { DomainSslJobData } from "../queues.js";

export async function processDomainSsl(job: Job<DomainSslJobData>): Promise<{ ok: true }> {
  console.log(
    `[domain-ssl] job=${job.id} hostname=${job.data.hostname} domainId=${job.data.domainId} tenantId=${job.data.tenantId}`,
  );
  // Stub: verify DNS and provision/renew TLS for custom domains.
  return { ok: true };
}
