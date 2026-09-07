export const QUEUE_NAMES = {
  email: "email",
  pdf: "pdf",
  stripeSync: "stripe-sync",
  domainSsl: "domain-ssl",
  availabilityReindex: "availability-reindex",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Retry policy shared by every queue. Transactional email and Stripe syncs are worth retrying
 * a few times with backoff; a permanently bad job throws UnrecoverableError instead.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 86_400, count: 1_000 },
  // Failures are kept for a fortnight so a tenant can be told what went wrong.
  removeOnFail: { age: 14 * 86_400 },
};

export type EmailJobData = {
  to: string;
  /** Which tenant the email is for — decides branding and which template row is used. */
  tenantId?: string;
  /** Template key, e.g. booking_confirmation. Omit only when passing raw html. */
  template?: string;
  locale?: string;
  vars?: Record<string, string | number | null | undefined>;
  /** Overrides the template subject when set. */
  subject?: string;
  /** Raw body, used for admin test sends and previews. */
  html?: string;
};

export type PdfJobData = {
  bookingId: string;
  tenantId: string;
  kind: "invoice" | "receipt";
};

export type StripeSyncJobData = {
  tenantId: string;
  accountId?: string;
  reason?: string;
};

export type DomainSslJobData = {
  domainId: string;
  hostname: string;
  tenantId: string;
};

export type AvailabilityReindexJobData = {
  tenantId: string;
  productId?: string;
};
