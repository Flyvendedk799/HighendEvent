import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE_NAMES } from "./queues.js";
import { processEmail } from "./processors/email.js";
import { processPdf } from "./processors/pdf.js";
import { processStripeSync } from "./processors/stripe-sync.js";
import { processDomainSsl } from "./processors/domain-ssl.js";
import { processAvailabilityReindex } from "./processors/availability-reindex.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

const workers: Worker[] = [
  new Worker(QUEUE_NAMES.email, processEmail, { connection }),
  new Worker(QUEUE_NAMES.pdf, processPdf, { connection }),
  new Worker(QUEUE_NAMES.stripeSync, processStripeSync, { connection }),
  new Worker(QUEUE_NAMES.domainSsl, processDomainSsl, { connection }),
  new Worker(QUEUE_NAMES.availabilityReindex, processAvailabilityReindex, {
    connection,
  }),
];

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`[worker] completed queue=${worker.name} job=${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] failed queue=${worker.name} job=${job?.id} error=${err.message}`);
  });
}

console.log(`[worker] connected to ${redisUrl}`);
console.log(`[worker] listening on queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[worker] ${signal} received, shutting down gracefully…`);

  await Promise.allSettled(workers.map((w) => w.close()));
  connection.disconnect();
  console.log("[worker] shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
