import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingSource, DeliveryType, Prisma } from "@prisma/client";
import {
  assertTransition,
  availableQuantity,
  calculateBookingPricing,
  canTransition,
  DEFAULT_BOOKING_STATUSES,
  generateBookingNo,
  getConflictingBookings,
  rentalDays,
  type StatusDefinition,
} from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { NotificationsService } from "../notifications/notifications.service";

export type BookingItemInput = {
  productId: string;
  quantity: number;
  upsells?: Array<{ upsellProductId: string; quantity?: number }>;
};

export type CreateBookingInput = {
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
  deliveryBreakdown?: Record<string, unknown>;
  customerId?: string;
  notes?: string;
  internalNotes?: string;
  locale?: string;
  couponCode?: string;
  discountMinor?: number;
  items: BookingItemInput[];
};

export type BookingListFilters = {
  statusKey?: string;
  q?: string;
  from?: string;
  to?: string;
  productId?: string;
  deliveryType?: DeliveryType;
  includeDeleted?: boolean;
  customerId?: string;
  take?: number;
  skip?: number;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(filters: BookingListFilters = {}) {
    const tenantId = requireTenantId();
    const where = this.buildWhere(tenantId, filters);

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: this.bookingInclude(),
        orderBy: { createdAt: "desc" },
        take: filters.take ?? undefined,
        skip: filters.skip ?? undefined,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total };
  }

  /** Kept for callers that just want the rows (ICS feed, dashboards). */
  async listAll(filters: BookingListFilters = {}) {
    const { items } = await this.list(filters);
    return items;
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: this.bookingInclude(),
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  /** The customer portal: a customer may only ever read their own bookings. */
  async getForCustomer(id: string, customerId: string) {
    const tenantId = requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, customerId, isDeleted: false },
      include: this.bookingInclude(),
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async listForCustomer(customerId: string) {
    const tenantId = requireTenantId();
    return this.prisma.booking.findMany({
      where: { tenantId, customerId, isDeleted: false },
      include: this.bookingInclude(),
      orderBy: { startDate: "desc" },
    });
  }

  async create(input: CreateBookingInput) {
    const tenantId = requireTenantId();

    const store = await this.prisma.store.findFirst({ where: { tenantId } });
    if (!store) throw new NotFoundException("Store not found");
    if (!input.items?.length) throw new BadRequestException("At least one item required");

    if (input.endDate < input.startDate) {
      throw new BadRequestException("endDate must be on or after startDate");
    }

    const priced = await this.priceItems(tenantId, input);

    const pricing = calculateBookingPricing({
      items: priced.pricingItems,
      deliveryFeeMinor: input.deliveryFeeMinor ?? 0,
      deliveryLabel: input.deliveryType === DeliveryType.DELIVERY ? "Delivery" : undefined,
      discountMinor: input.discountMinor ?? 0,
      tax: { taxPercentBps: store.taxPercentBps, inclusive: store.taxMode === "INCLUSIVE" },
      paymentModel: store.paymentModel,
      currency: store.currency,
    });

    // Add-ons are priced per booking, not per rental day.
    const upsellTotalMinor = priced.upsellLines.reduce(
      (sum, line) => sum + line.unitPriceMinor * line.quantity,
      0,
    );

    const totalMinor = pricing.totalMinor + upsellTotalMinor;
    const upfrontMinor =
      store.paymentModel === "DEPOSIT_REMAINDER"
        ? pricing.upfrontMinor
        : totalMinor;

    return this.prisma.booking.create({
      data: {
        tenantId,
        bookingNo: await this.nextBookingNo(tenantId),
        customerId: input.customerId,
        source: input.source === "MANUAL" ? BookingSource.MANUAL : BookingSource.ONLINE,
        customerName: input.customerName,
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country ?? store.country,
        locale: input.locale ?? store.localeDefault,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        currency: store.currency,
        subtotalMinor: pricing.subtotalMinor + upsellTotalMinor,
        taxMinor: pricing.taxMinor,
        depositMinor: pricing.depositMinor,
        deliveryFeeMinor: pricing.deliveryFeeMinor,
        deliveryBreakdown: (input.deliveryBreakdown ?? undefined) as Prisma.InputJsonValue,
        discountMinor: pricing.discountMinor,
        couponCode: input.couponCode,
        totalMinor,
        upfrontMinor,
        remainingMinor: Math.max(0, totalMinor - upfrontMinor),
        statusKey: "pending",
        deliveryType: input.deliveryType ?? DeliveryType.PICKUP,
        notes: input.notes,
        internalNotes: input.internalNotes,
        items: {
          create: priced.itemRows.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            unitPriceMinor: row.unitPriceMinor,
            nameSnapshot: row.nameSnapshot,
            upsells: {
              create: priced.upsellLines
                .filter((line) => line.productId === row.productId)
                .map((line) => ({
                  upsellProductId: line.upsellProductId,
                  quantity: line.quantity,
                  unitPriceMinor: line.unitPriceMinor,
                  nameSnapshot: line.nameSnapshot,
                })),
            },
          })),
        },
      },
      include: this.bookingInclude(),
    });
  }

  async transition(id: string, toStatus: string) {
    const booking = await this.get(id);
    const definitions = await this.statusDefinitions();

    assertTransition(booking.statusKey, toStatus, definitions);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        statusKey: toStatus,
        // Marking a booking fully paid settles the outstanding balance.
        ...(toStatus === "fully_paid"
          ? { upfrontMinor: booking.totalMinor, remainingMinor: 0 }
          : {}),
      },
      include: this.bookingInclude(),
    });

    // The customer hears about it. Queue failures never fail the transition.
    const label = definitions.find((d) => d.key === toStatus)?.label ?? toStatus;
    void this.notifications.sendBookingEmail(
      id,
      toStatus === "cancelled" ? "booking_cancelled" : "status_changed",
      { statusLabel: label },
    );

    return updated;
  }

  /** Statuses this booking may legally move to next, for the admin status control. */
  async allowedTransitions(id: string): Promise<StatusDefinition[]> {
    const booking = await this.get(id);
    const definitions = await this.statusDefinitions();
    return definitions.filter(
      (def) => def.key !== booking.statusKey && canTransition(booking.statusKey, def.key, definitions),
    );
  }

  async updateNotes(id: string, data: { notes?: string; internalNotes?: string }) {
    await this.get(id);
    return this.prisma.booking.update({
      where: { id },
      data: { notes: data.notes, internalNotes: data.internalNotes },
      include: this.bookingInclude(),
    });
  }

  async recordReturn(
    id: string,
    data: { returnCondition?: string; damageFeeMinor?: number; internalNotes?: string },
  ) {
    const booking = await this.get(id);
    const damageFeeMinor = data.damageFeeMinor ?? booking.damageFeeMinor;

    return this.prisma.booking.update({
      where: { id },
      data: {
        returnCondition: data.returnCondition,
        damageFeeMinor,
        internalNotes: data.internalNotes ?? booking.internalNotes,
        // A damage fee is owed on top of whatever was already settled.
        remainingMinor: Math.max(
          0,
          booking.totalMinor + damageFeeMinor - (booking.totalMinor - booking.remainingMinor),
        ),
      },
      include: this.bookingInclude(),
    });
  }

  /**
   * Moves a booking to new dates, re-checking availability while ignoring the booking itself —
   * otherwise a booking would always collide with its own occupancy.
   */
  async reschedule(id: string, startDate: string, endDate: string) {
    const tenantId = requireTenantId();
    const booking = await this.get(id);

    if (endDate < startDate) {
      throw new BadRequestException("endDate must be on or after startDate");
    }

    for (const item of booking.items) {
      const { product, bookings, blackouts } = await this.loadAvailability(
        tenantId,
        item.productId,
      );
      const available = availableQuantity({
        product,
        startDate,
        endDate,
        bookings,
        blackouts,
        excludeBookingId: booking.id,
      });

      if (available < item.quantity) {
        const conflicts = getConflictingBookings({
          product,
          startDate,
          endDate,
          bookings,
          excludeBookingId: booking.id,
        });
        throw new ConflictException(
          `${item.nameSnapshot}: only ${available} available on those dates` +
            (conflicts.length ? ` (conflicts with ${conflicts.map((c) => c.bookingNo).join(", ")})` : ""),
        );
      }
    }

    return this.prisma.booking.update({
      where: { id },
      data: { startDate: new Date(startDate), endDate: new Date(endDate) },
      include: this.bookingInclude(),
    });
  }

  async softDelete(id: string, reason?: string) {
    await this.get(id);
    return this.prisma.booking.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletionReason: reason },
    });
  }

  async restore(id: string) {
    await this.get(id);
    return this.prisma.booking.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, deletionReason: null },
      include: this.bookingInclude(),
    });
  }

  /** ICS feed for staff calendars (Outlook/Google). Tenant-scoped. */
  async toIcs(filters?: BookingListFilters): Promise<string> {
    const bookings = await this.listAll(filters);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rentora//Bookings//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const booking of bookings) {
      const summary = escapeIcs(
        `${booking.bookingNo} — ${booking.customerName} (${booking.statusKey})`,
      );
      const description = escapeIcs(
        [
          `Customer: ${booking.customerName}`,
          `Email: ${booking.email}`,
          `Phone: ${booking.phone}`,
          `Fulfilment: ${booking.deliveryType}`,
          `Items: ${booking.items.map((i) => `${i.nameSnapshot}x${i.quantity}`).join(", ")}`,
          booking.notes ? `Notes: ${booking.notes}` : "",
        ]
          .filter(Boolean)
          .join("\\n"),
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${booking.id}@rentora`,
        `DTSTAMP:${toIcsDateTime(new Date())}`,
        `DTSTART;VALUE=DATE:${toIcsDate(booking.startDate)}`,
        // DTEND is exclusive in iCalendar, so an inclusive rental ends the following day.
        `DTEND;VALUE=DATE:${toIcsDate(addOneDay(booking.endDate))}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${escapeIcs(`${booking.address}, ${booking.zipCode} ${booking.city}`)}`,
        "END:VEVENT",
      );
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  // ------------------------------------------------------------------ Internals

  private bookingInclude() {
    return {
      items: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } },
          upsells: { include: { upsellProduct: true } },
        },
      },
      customer: true,
    };
  }

  private buildWhere(tenantId: string, filters: BookingListFilters): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {
      tenantId,
      isDeleted: filters.includeDeleted ? undefined : false,
      statusKey: filters.statusKey,
      deliveryType: filters.deliveryType,
      customerId: filters.customerId,
    };

    if (filters.from || filters.to) {
      // A booking is "in" a window if its dates overlap it at all.
      where.AND = [
        filters.to ? { startDate: { lte: new Date(filters.to) } } : {},
        filters.from ? { endDate: { gte: new Date(filters.from) } } : {},
      ];
    }

    if (filters.productId) {
      where.items = { some: { productId: filters.productId } };
    }

    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { bookingNo: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private async statusDefinitions(): Promise<StatusDefinition[]> {
    const tenantId = requireTenantId();
    const rows = await this.prisma.bookingStatusDefinition.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (rows.length === 0) return DEFAULT_BOOKING_STATUSES;

    // Tenants can rename and reorder statuses, but the legal transitions stay the domain's.
    return rows.map((row) => {
      const fallback = DEFAULT_BOOKING_STATUSES.find((s) => s.key === row.key);
      return {
        key: row.key,
        label: row.label,
        isTerminal: row.isTerminal,
        allowedNext: fallback?.allowedNext ?? [],
      };
    });
  }

  private async priceItems(tenantId: string, input: CreateBookingInput) {
    const pricingItems = [];
    const itemRows = [];
    const upsellLines = [];

    for (const item of input.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      const days = rentalDays(input.startDate, input.endDate);
      if (days < product.minRentalDays) {
        throw new BadRequestException(
          `${product.name} has a minimum rental of ${product.minRentalDays} day(s)`,
        );
      }
      if (product.maxRentalDays && days > product.maxRentalDays) {
        throw new BadRequestException(
          `${product.name} can be rented for at most ${product.maxRentalDays} day(s)`,
        );
      }

      const { product: availabilityProduct, bookings, blackouts } =
        await this.loadAvailability(tenantId, product.id);

      const available = availableQuantity({
        product: availabilityProduct,
        startDate: input.startDate,
        endDate: input.endDate,
        bookings,
        blackouts,
      });

      if (available < item.quantity) {
        throw new ConflictException(
          available === 0
            ? `${product.name} is not available on those dates`
            : `Only ${available} × ${product.name} available on those dates`,
        );
      }

      pricingItems.push({
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

      itemRows.push({
        productId: product.id,
        quantity: item.quantity,
        // Filled in below from the priced line, so the snapshot matches what was charged.
        unitPriceMinor: product.dailyPriceMinor,
        nameSnapshot: product.name,
      });

      for (const upsell of item.upsells ?? []) {
        const row = await this.prisma.upsellProduct.findFirst({
          where: { id: upsell.upsellProductId, tenantId, isActive: true },
        });
        if (!row) throw new NotFoundException(`Add-on ${upsell.upsellProductId} not found`);
        upsellLines.push({
          productId: product.id,
          upsellProductId: row.id,
          quantity: upsell.quantity ?? 1,
          unitPriceMinor: row.priceMinor,
          nameSnapshot: row.name,
        });
      }
    }

    // Snapshot the effective per-day rate the pricing engine actually used.
    const preview = calculateBookingPricing({
      items: pricingItems,
      tax: { taxPercentBps: 0, inclusive: true },
      paymentModel: "FULL_UPFRONT",
      currency: "USD",
    });
    preview.lineItems.forEach((line, index) => {
      if (itemRows[index]) itemRows[index]!.unitPriceMinor = line.unitPriceMinor;
    });

    return { pricingItems, itemRows, upsellLines };
  }

  private async loadAvailability(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { id: productId, tenantId },
    });

    const [bookingItems, blackouts] = await Promise.all([
      this.prisma.bookingItem.findMany({
        where: { productId, booking: { tenantId, isDeleted: false } },
        include: { booking: true },
      }),
      this.prisma.blackoutDate.findMany({ where: { productId } }),
    ]);

    return {
      product: {
        id: product.id,
        stockQty: product.stockQty,
        prepBufferDays: product.prepBufferDays,
        cleanupBufferDays: product.cleanupBufferDays,
        isActive: product.isActive,
      },
      bookings: bookingItems.map((item) => ({
        id: item.booking.id,
        bookingNo: item.booking.bookingNo,
        productId: item.productId,
        quantity: item.quantity,
        startDate: item.booking.startDate,
        endDate: item.booking.endDate,
        statusKey: item.booking.statusKey,
        isDeleted: item.booking.isDeleted,
      })),
      blackouts: blackouts.map((b) => ({
        productId,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
    };
  }

  /** Retries on the (tenantId, bookingNo) unique constraint rather than trusting randomness. */
  private async nextBookingNo(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = generateBookingNo("RNT");
      const clash = await this.prisma.booking.findUnique({
        where: { tenantId_bookingNo: { tenantId, bookingNo: candidate } },
      });
      if (!clash) return candidate;
    }
    return `RNT-${Date.now().toString(36).toUpperCase()}`;
  }
}

function toIcsDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("");
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
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
