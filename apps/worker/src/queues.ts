export const QUEUE_NAMES = {
  email: "email",
  pdf: "pdf",
  stripeSync: "stripe-sync",
  domainSsl: "domain-ssl",
  availabilityReindex: "availability-reindex",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type EmailJobData = {
  to: string;
  subject: string;
  template?: string;
  vars?: Record<string, string>;
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
