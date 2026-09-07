import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { NotificationsService } from "../notifications/notifications.service";

/** The lifecycle events Rentora sends mail for, and what each one can reference. */
export const TEMPLATE_CATALOG = [
  {
    key: "booking_confirmation",
    name: "Booking confirmation",
    description: "Sent as soon as a booking is paid for.",
  },
  {
    key: "payment_reminder",
    name: "Payment reminder",
    description: "Chases the outstanding balance on a deposit booking.",
  },
  {
    key: "status_changed",
    name: "Status change",
    description: "Tells the customer their booking moved to a new status.",
  },
  {
    key: "booking_cancelled",
    name: "Booking cancelled",
    description: "Sent when a booking is cancelled.",
  },
  {
    key: "staff_invite",
    name: "Staff invitation",
    description: "Invites a colleague into your admin console.",
  },
] as const;

const AVAILABLE_VARS = [
  "storeName",
  "bookingNo",
  "customerName",
  "startDate",
  "endDate",
  "total",
  "paid",
  "remaining",
  "deposit",
  "delivery",
  "address",
  "items",
  "statusLabel",
  "supportEmail",
];

/** Sample values so a preview shows something recognisable rather than empty placeholders. */
const SAMPLE_VARS: Record<string, string> = {
  bookingNo: "RNT-260901-4KX2",
  customerName: "Maja Sørensen",
  startDate: "12 September 2026",
  endDate: "14 September 2026",
  total: "8,240.00 DKK",
  paid: "2,472.00 DKK",
  remaining: "5,768.00 DKK",
  deposit: "5,000.00 DKK",
  delivery: "Delivery",
  address: "Nørrebrogade 42, 2200 Copenhagen",
  items: "6x12m Marquee x1, Chiavari Chair x60",
  statusLabel: "Fully paid",
};

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list() {
    const tenantId = requireTenantId();
    const rows = await this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: [{ key: "asc" }, { locale: "asc" }],
    });

    // Every catalog entry appears, whether or not the tenant has customised it, so nothing
    // Rentora sends is invisible to the tenant.
    return {
      templates: rows,
      catalog: TEMPLATE_CATALOG.map((entry) => ({
        ...entry,
        customised: rows.some((row) => row.key === entry.key),
      })),
      variables: AVAILABLE_VARS,
    };
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const template = await this.prisma.emailTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async create(data: {
    key: string;
    subject: string;
    bodyHtml: string;
    locale?: string;
    isActive?: boolean;
  }) {
    const tenantId = requireTenantId();
    const locale = data.locale ?? "en";

    const existing = await this.prisma.emailTemplate.findUnique({
      where: { tenantId_key_locale: { tenantId, key: data.key, locale } },
    });
    if (existing) {
      // Saving an existing template from the editor should update it, not fail.
      return this.prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          isActive: data.isActive ?? existing.isActive,
        },
      });
    }

    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        key: data.key,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        locale,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: { subject?: string; bodyHtml?: string; isActive?: boolean; locale?: string },
  ) {
    await this.get(id);
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  /** Renders a template with sample data, for the admin preview pane. */
  preview(input: { subject: string; bodyHtml: string }) {
    const fill = (text: string) =>
      text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => SAMPLE_VARS[key] ?? `{{${key}}}`);

    const unknown = [...input.bodyHtml.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)]
      .map((match) => match[1]!)
      .filter((key) => !AVAILABLE_VARS.includes(key));

    return {
      subject: fill(input.subject),
      bodyHtml: fill(input.bodyHtml),
      unknownVariables: [...new Set(unknown)],
    };
  }

  /** Sends the template to a chosen address so a tenant can see the real thing. */
  async sendTest(input: { to: string; subject: string; bodyHtml: string }) {
    const tenantId = requireTenantId();

    if (!input.to.includes("@")) {
      throw new BadRequestException("Enter a valid email address");
    }

    const rendered = this.preview(input);

    const result = await this.notifications.enqueue({
      to: input.to,
      tenantId,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.bodyHtml,
    });

    return {
      ...result,
      to: input.to,
      message: result.queued
        ? `Queued a test message to ${input.to}.`
        : (result.reason ?? "The email queue is not configured on this deployment."),
    };
  }
}
