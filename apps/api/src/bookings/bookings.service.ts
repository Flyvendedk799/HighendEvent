import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingSource, DeliveryType } from "@prisma/client";
import {
  assertTransition,
  availableQuantity,
  calculateBookingPricing,
  DEFAULT_BOOKING_STATUSES,
  generateBookingNo,
} from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { NotificationsService } from "../notifications/notifications.service";
import type { JwtPayload } from "../auth/password";

type BookingItemInput = {
  productId: string;
  quantity: number;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(filters?: { statusKey?: string; customerId?: string; includeDeleted?: boolean }) {
    const tenantId = requireTenantId();
    return this.prisma.booking.findMany({
      where: {
        tenantId,
        isDeleted: filters?.includeDeleted ? undefined : false,
        statusKey: filters?.statusKey,
        customerId: filters?.customerId,
      },
      include: {
        items: { include: { product: true, upsells: true } },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string, user?: JwtPayload) {
    const tenantId = requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { product: true, upsells: true } },
        customer: true,
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (user?.role === "customer" && booking.customerId !== user.sub) {
      throw new ForbiddenException("Not your booking");
    }
    return booking;
  }

  async getWithOps(id: string, user?: JwtPayload) {
    const booking = await this.get(id, user);
    return { ...booking, payments: this.buildPaymentTimeline(booking) };
  }

  buildPaymentTimeline(booking: {
    id: string;
    currency: string;
    statusKey: string;
    upfrontMinor: number;
    remainingMinor: number;
    depositMinor: number;
    totalMinor: number;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
    remainingSessionId: string | null;
    remainingPaymentIntentId: string | null;
    depositRefunded: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const entries: Array<{
      id: string;
      kind: "status" | "upfront" | "remainder" | "refund";
      label: string;
      amountMinor: number | null;
      currency: string;
      status: string;
      reference: string | null;
      at: string;
    }> = [
      {
        id: `${booking.id}-created`,
        kind: "status",
        label: "Booking created",
        amountMinor: booking.totalMinor,
        currency: booking.currency,
        status: "recorded",
        reference: null,
        at: booking.createdAt.toISOString(),
      },
    ];

    if (
      booking.stripeSessionId ||
      ["deposit_paid", "fully_paid"].includes(booking.statusKey)
    ) {
      entries.push({
        id: `${booking.id}-upfront`,
        kind: "upfront" as const,
        label:
          booking.remainingMinor > 0 && booking.statusKey === "deposit_paid"
            ? "Deposit / upfront collected"
            : "Upfront payment",
        amountMinor: booking.upfrontMinor,
        currency: booking.currency,
        status:
          booking.stripePaymentIntentId || booking.stripeSessionId
            ? "succeeded"
            : "pending",
        reference: booking.stripePaymentIntentId ?? booking.stripeSessionId,
        at: booking.updatedAt.toISOString(),
      });
    }

    if (booking.remainingMinor > 0) {
      entries.push({
        id: `${booking.id}-remainder`,
        kind: "remainder" as const,
        label: "Remainder due",
        amountMinor: booking.remainingMinor,
        currency: booking.currency,
        status:
          booking.statusKey === "fully_paid"
            ? "succeeded"
            : booking.remainingSessionId
              ? "checkout_open"
              : "due",
        reference:
          booking.remainingPaymentIntentId ?? booking.remainingSessionId,
        at: booking.updatedAt.toISOString(),
      });
    }

    if (booking.depositRefunded) {
      entries.push({
        id: `${booking.id}-refund`,
        kind: "refund" as const,
        label: "Deposit refunded",
        amountMinor: booking.depositMinor,
        currency: booking.currency,
        status: "refunded",
        reference: null,
        at: booking.updatedAt.toISOString(),
      });
    }

    return entries;
  }

  async updateNotes(
    id: string,
    input: { notes?: string | null; internalNotes?: string | null },
  ) {
    await this.get(id);
    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.internalNotes !== undefined
          ? { internalNotes: input.internalNotes }
          : {}),
      },
      include: {
        items: { include: { product: true, upsells: true } },
        customer: true,
      },
    });
  }

  async resendConfirmation(id: string) {
    const booking = await this.get(id);
    await this.notifications.enqueueBookingConfirmation({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      email: booking.email,
      customerName: booking.customerName,
      bookingNo: booking.bookingNo,
    });
    return { ok: true, bookingId: booking.id, emailedTo: booking.email };
  }

  async create(input: {
    source: "ONLINE" | "MANUAL";
    customerName: string;
    email: string;
    phone: string;
    address: string;
    zipCode: string;
    city: string;
    country?: string;
    startDate: string;
    endDate: string;
    deliveryType?: DeliveryType;
    deliveryFeeMinor?: number;
    customerId?: string;
    notes?: string;
    items: BookingItemInput[];
  }) {
    const tenantId = requireTenantId();
    const store = await this.prisma.store.findFirst({ where: { tenantId } });
    if (!store) throw new NotFoundException("Store not found");
    if (!input.items?.length) throw new BadRequestException("At least one item required");

    const pricedItems = [];
    for (const item of input.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      const bookingItems = await this.prisma.bookingItem.findMany({
        where: { productId: product.id, booking: { tenantId, isDeleted: false } },
        include: { booking: true },
      });
      const blackouts = await this.prisma.blackoutDate.findMany({
        where: { productId: product.id },
      });
      const qty = availableQuantity({
        product: {
          id: product.id,
          stockQty: product.stockQty,
          prepBufferDays: product.prepBufferDays,
          cleanupBufferDays: product.cleanupBufferDays,
          isActive: product.isActive,
        },
        startDate: input.startDate,
        endDate: input.endDate,
        bookings: bookingItems.map((bi) => ({
          id: bi.booking.id,
          bookingNo: bi.booking.bookingNo,
          productId: bi.productId,
          quantity: bi.quantity,
          startDate: bi.booking.startDate,
          endDate: bi.booking.endDate,
          statusKey: bi.booking.statusKey,
          isDeleted: bi.booking.isDeleted,
        })),
        blackouts: blackouts.map((b) => ({
          productId: product.id,
          startDate: b.startDate,
          endDate: b.endDate,
        })),
      });
      if (qty < item.quantity) {
        throw new BadRequestException(
          `Insufficient availability for ${product.name}: ${qty} available`,
        );
      }

      pricedItems.push({
        product: {
          id: product.id,
          name: product.name,
          dailyPriceMinor: product.dailyPriceMinor,
          weekendPriceMinor: product.weekendPriceMinor,
          weekendPackageMinor: product.weekendPackageMinor,
          depositMinor: product.depositMinor,
          currency: product.currency,
          isActive: product.isActive,
        },
        quantity: item.quantity,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }

    const pricing = calculateBookingPricing({
      items: pricedItems,
      deliveryFeeMinor: input.deliveryFeeMinor ?? 0,
      tax: {
        taxPercentBps: store.taxPercentBps,
        inclusive: store.taxMode === "INCLUSIVE",
      },
      paymentModel: store.paymentModel,
      currency: store.currency,
    });

    
    let customerId = input.customerId;
    if (!customerId && input.email) {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { tenantId_email: { tenantId, email: input.email.toLowerCase() } },
      });
      if (existingCustomer) customerId = existingCustomer.id;
    }

const bookingNo = generateBookingNo("RNT");

    return this.prisma.booking.create({
      data: {
        tenantId,
        bookingNo,
        customerId,
        source: input.source === "MANUAL" ? BookingSource.MANUAL : BookingSource.ONLINE,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country ?? store.country,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        currency: store.currency,
        subtotalMinor: pricing.subtotalMinor,
        taxMinor: pricing.taxMinor,
        depositMinor: pricing.depositMinor,
        deliveryFeeMinor: pricing.deliveryFeeMinor,
        totalMinor: pricing.totalMinor,
        upfrontMinor: pricing.upfrontMinor,
        remainingMinor: pricing.remainingMinor,
        statusKey: "pending",
        deliveryType: input.deliveryType ?? DeliveryType.PICKUP,
        notes: input.notes,
        items: {
          create: pricedItems.map((pi, idx) => ({
            productId: pi.product.id,
            quantity: pi.quantity,
            unitPriceMinor: pricing.lineItems[idx]?.unitPriceMinor ?? pi.product.dailyPriceMinor,
            nameSnapshot: pi.product.name,
          })),
        },
      },
      include: { items: true },
    });
  }

  async transition(id: string, toStatus: string) {
    const booking = await this.get(id);
    const tenantId = requireTenantId();
    const defs = await this.prisma.bookingStatusDefinition.findMany({
      where: { tenantId, isActive: true },
    });
    const definitions =
      defs.length > 0
        ? defs.map((d) => {
            const fallback = DEFAULT_BOOKING_STATUSES.find((s) => s.key === d.key);
            return {
              key: d.key,
              label: d.label,
              isTerminal: d.isTerminal,
              allowedNext: fallback?.allowedNext ?? [],
            };
          })
        : DEFAULT_BOOKING_STATUSES;

    assertTransition(booking.statusKey, toStatus, definitions);

    return this.prisma.booking.update({
      where: { id },
      data: { statusKey: toStatus },
    });
  }

  async softDelete(id: string, reason?: string) {
    await this.get(id);
    return this.prisma.booking.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletionReason: reason,
      },
    });
  }

  /** ICS feed for staff calendars (Outlook/Google). Tenant-scoped. */
  async toIcs(filters?: { statusKey?: string }): Promise<string> {
    const bookings = await this.list(filters);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rentora//Bookings//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const booking of bookings) {
      const dtStart = toIcsDate(booking.startDate);
      const dtEnd = toIcsDate(addOneDay(booking.endDate));
      const summary = escapeIcs(
        `${booking.bookingNo} — ${booking.customerName} (${booking.statusKey})`,
      );
      const description = escapeIcs(
        [
          `Customer: ${booking.customerName}`,
          `Email: ${booking.email}`,
          `Phone: ${booking.phone}`,
          `Items: ${booking.items.map((i) => `${i.nameSnapshot}×${i.quantity}`).join(", ")}`,
          booking.notes ? `Notes: ${booking.notes}` : "",
        ]
          .filter(Boolean)
          .join("\\n"),
      );
      lines.push(
        "BEGIN:VEVENT",
        `UID:${booking.id}@rentora`,
        `DTSTAMP:${toIcsDateTime(new Date())}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        "END:VEVENT",
      );
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  async toIcsOne(id: string): Promise<string> {
    const booking = await this.get(id);
    const dtStart = toIcsDate(booking.startDate);
    const dtEnd = toIcsDate(addOneDay(booking.endDate));
    const summary = escapeIcs(
      `${booking.bookingNo} — ${booking.customerName} (${booking.statusKey})`,
    );
    const description = escapeIcs(
      [
        `Customer: ${booking.customerName}`,
        `Email: ${booking.email}`,
        `Phone: ${booking.phone}`,
        `Items: ${booking.items.map((i) => `${i.nameSnapshot}×${i.quantity}`).join(", ")}`,
        booking.notes ? `Notes: ${booking.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rentora//Bookings//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${booking.id}@rentora`,
      `DTSTAMP:${toIcsDateTime(new Date())}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }
}

function toIcsDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function toIcsDateTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function addOneDay(value: Date | string): Date {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
