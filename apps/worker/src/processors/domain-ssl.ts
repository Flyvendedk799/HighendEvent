import type { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { DomainSslJobData } from "../queues.js";

const prisma = new PrismaClient();

export async function processDomainSsl(job: Job<DomainSslJobData>): Promise<{ ok: true }> {
  console.log(
    `[domain-ssl] job=${job.id} hostname=${job.data.hostname} domainId=${job.data.domainId} tenantId=${job.data.tenantId}`,
  );
  // Stub provisioner: mark SSL active after verification. Wire ACME/cert manager in production.
  await prisma.customDomain.updateMany({
    where: { id: job.data.domainId, tenantId: job.data.tenantId },
    data: { sslStatus: "active", verified: true },
  });
  return { ok: true };
}
