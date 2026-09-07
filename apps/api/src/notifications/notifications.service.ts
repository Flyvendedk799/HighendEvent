import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

export type EmailJob = {
  to: string;
  tenantId?: string;
  template?: string;
  locale?: string;
  vars?: Record<string, string | number | null | undefined>;
  subject?: string;
  html?: string;
};

const EMAIL_QUEUE = "email";

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail: { age: 14 * 86_400 },
};

/**
 * Hands transactional email to the worker.
 *
 * Enqueuing never fails a request: a booking must not be rolled back because Redis blinked.
 * Failures are logged and the caller carries on.
 */
@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private queue: Queue | null = null;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        this.queue = new Queue(EMAIL_QUEUE, {
          connection: { url },
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
      } catch (err) {
        this.logger.warn(
          `Could not connect to Redis, email will not be queued: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    } else {
      this.logger.warn("REDIS_URL is not set — transactional email will not be queued");
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  get enabled(): boolean {
    return this.queue !== null;
  }

  async enqueue(job: EmailJob): Promise<{ queued: boolean; reason?: string }> {
    if (!this.queue) {
      this.logger.log(
        `Email not queued (no Redis): to=${job.to} template=${job.template ?? "inline"}`,
      );
      return { queued: false, reason: "Email queue is not configured" };
    }

    try {
      await this.queue.add(job.template ?? "email", job);
      return { queued: true };
    } catch (err) {
      this.logger.error(
        `Failed to queue email to ${job.to}: ${err instanceof Error ? err.message : err}`,
      );
      return { queued: false, reason: "Could not reach the email queue" };
    }
  }

  /** Everything a booking template can reference, formatted for the store locale. */
  async bookingVars(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true, tenant: { include: { stores: { take: 1 } } } },
    });
    if (!booking) return null;

    const store = booking.tenant.stores[0];
    const locale = store?.localeDefault ?? "en";
    const money = (minor: number) =>
      new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-GB", {
        style: "currency",
        currency: booking.currency,
      }).format(minor / 100);

    const date = (value: Date) =>
      new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(value);

    return {
      tenantId: booking.tenantId,
      locale,
      to: booking.email,
      vars: {
        bookingNo: booking.bookingNo,
        customerName: booking.customerName,
        storeName: store?.name ?? booking.tenant.name,
        startDate: date(booking.startDate),
        endDate: date(booking.endDate),
        total: money(booking.totalMinor),
        paid: money(booking.totalMinor - booking.remainingMinor),
        remaining: money(booking.remainingMinor),
        deposit: money(booking.depositMinor),
        delivery: booking.deliveryType === "DELIVERY" ? "Delivery" : "Collection",
        address: `${booking.address}, ${booking.zipCode} ${booking.city}`,
        items: booking.items.map((item) => `${item.nameSnapshot} x${item.quantity}`).join(", "),
        supportEmail: store?.supportEmail ?? "",
      },
    };
  }

  /** Sends one of the booking lifecycle emails, filling in the variables from the booking. */
  async sendBookingEmail(
    bookingId: string,
    template: string,
    extraVars: Record<string, string> = {},
  ) {
    const context = await this.bookingVars(bookingId);
    if (!context) return { queued: false, reason: "Booking not found" };

    return this.enqueue({
      to: context.to,
      tenantId: context.tenantId,
      template,
      locale: context.locale,
      vars: { ...context.vars, ...extraVars },
    });
  }
}
