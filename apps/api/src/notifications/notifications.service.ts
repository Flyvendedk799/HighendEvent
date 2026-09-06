import { Inject, Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

type BookingEmailInput = {
  tenantId: string;
  bookingId: string;
  email: string;
  customerName: string;
  bookingNo: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("EMAIL_QUEUE") private readonly emailQueue: Queue,
  ) {}

  async enqueueBookingConfirmation(input: BookingEmailInput) {
    const [store, template] = await Promise.all([
      this.prisma.store.findFirst({ where: { tenantId: input.tenantId } }),
      this.prisma.emailTemplate.findFirst({
        where: {
          tenantId: input.tenantId,
          key: "booking_confirmation",
          locale: "en",
          isActive: true,
        },
      }),
    ]);

    const storeName = store?.name ?? "Rentora";
    const vars: Record<string, string> = {
      storeName,
      customerName: input.customerName,
      bookingNo: input.bookingNo,
      name: input.customerName,
      body: `Your booking ${input.bookingNo} with ${storeName} is confirmed.`,
    };

    const subject = this.interpolate(
      template?.subject ?? "Your booking is confirmed",
      vars,
    );
    const html = template?.bodyHtml
      ? this.interpolate(template.bodyHtml, vars)
      : undefined;

    try {
      await this.emailQueue.add("booking_confirmation", {
        to: input.email,
        subject,
        template: "booking_confirmation",
        vars,
        html,
      });
      this.logger.log(`Queued booking confirmation for ${input.bookingNo} → ${input.email}`);
    } catch (err) {
      this.logger.error(
        `Failed to queue booking email for ${input.bookingNo}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async close() {
    await this.emailQueue.close();
  }

  private interpolate(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
  }
}
