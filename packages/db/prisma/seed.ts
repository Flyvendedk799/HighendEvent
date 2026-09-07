import { randomBytes, scryptSync } from "node:crypto";
import {
  PrismaClient,
  PlanTier,
  StaffRole,
  DeliveryType,
  PaymentModel,
  TaxMode,
  BookingSource,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Must stay byte-compatible with apps/api/src/auth/password.ts — the API verifies these hashes.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", 16_384, 8, 1, salt.toString("hex"), derived.toString("hex")].join("$");
}

const DAY = 86_400_000;

/** Dates are seeded relative to today so the demo calendar always has live occupancy. */
function daysFromToday(offset: number): Date {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(utc + offset * DAY);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const STATUS_DEFS = [
  { key: "pending", label: "Pending payment", color: "#F59E0B", sortOrder: 0, isTerminal: false },
  { key: "deposit_paid", label: "Deposit paid", color: "#3B82F6", sortOrder: 1, isTerminal: false },
  { key: "fully_paid", label: "Fully paid", color: "#10B981", sortOrder: 2, isTerminal: false },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    color: "#8B5CF6",
    sortOrder: 3,
    isTerminal: false,
  },
  {
    key: "returned_good",
    label: "Returned (good)",
    color: "#14B8A6",
    sortOrder: 4,
    isTerminal: false,
  },
  {
    key: "returned_damaged",
    label: "Returned (damaged)",
    color: "#EF4444",
    sortOrder: 5,
    isTerminal: false,
  },
  {
    key: "deposit_refunded",
    label: "Deposit refunded",
    color: "#64748B",
    sortOrder: 6,
    isTerminal: true,
  },
  { key: "cancelled", label: "Cancelled", color: "#DC2626", sortOrder: 7, isTerminal: true },
];

const EMAIL_TEMPLATES = [
  {
    key: "booking_confirmation",
    subject: "Your booking {{bookingNo}} is confirmed",
    bodyHtml:
      "<p>Hi {{customerName}},</p><p>Thanks for booking with {{storeName}}. Your rental runs {{startDate}} to {{endDate}}.</p><p>Total: {{total}}</p>",
  },
  {
    key: "payment_reminder",
    subject: "Balance due for booking {{bookingNo}}",
    bodyHtml:
      "<p>Hi {{customerName}},</p><p>The remaining balance of {{remaining}} for booking {{bookingNo}} is due before {{startDate}}.</p>",
  },
  {
    key: "status_changed",
    subject: "Booking {{bookingNo}} is now {{statusLabel}}",
    bodyHtml: "<p>Hi {{customerName}},</p><p>Your booking is now <b>{{statusLabel}}</b>.</p>",
  },
  {
    key: "booking_cancelled",
    subject: "Booking {{bookingNo}} was cancelled",
    bodyHtml: "<p>Hi {{customerName}},</p><p>Booking {{bookingNo}} has been cancelled.</p>",
  },
  {
    key: "staff_invite",
    subject: "You have been invited to {{storeName}}",
    bodyHtml: "<p>{{inviterName}} invited you to help run {{storeName}}.</p><p>{{inviteUrl}}</p>",
  },
];

const CMS_PAGES = [
  {
    slug: "about",
    title: "About us",
    sections: [
      {
        type: "richText",
        heading: "Events, handled",
        body: "We have kitted out celebrations across the region since 2011 — from garden parties to 400-guest weddings. Everything in our catalogue is cleaned, tested, and delivered by our own crew.",
      },
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    sections: [
      {
        type: "faq",
        heading: "Frequently asked questions",
        items: [
          {
            q: "How far in advance should I book?",
            a: "Two to four weeks for most items; longer for marquees in peak summer.",
          },
          {
            q: "Do you deliver?",
            a: "Yes. Delivery is quoted from your address at checkout, and pickup from our warehouse is always free.",
          },
          {
            q: "What happens if something breaks?",
            a: "Normal wear is covered. Damage beyond that is charged against the deposit, itemised on your invoice.",
          },
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Rental terms",
    sections: [
      {
        type: "richText",
        heading: "Rental terms",
        body: "A deposit secures your dates. The balance falls due before delivery. Cancellations more than 14 days out are refunded in full.",
      },
    ],
  },
];

async function main() {
  const platformPassword = process.env.SEED_PLATFORM_PASSWORD ?? "admin123";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "demo1234";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "customer123";

  await prisma.platformUser.upsert({
    where: { email: "admin@rentora.app" },
    update: { isActive: true },
    create: {
      email: "admin@rentora.app",
      name: "Platform Admin",
      passwordHash: hashPassword(platformPassword),
      isActive: true,
    },
  });

  const slug = "demo";

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      name: "Demo Events",
      slug,
      plan: PlanTier.GROWTH,
      applicationFeeBps: 250,
      featureFlags: { customDomains: true, upsells: true, deliveryZones: true },
    },
  });

  const store = await prisma.store.findFirst({ where: { tenantId: tenant.id } }) ??
    (await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: "Demo Events",
        tagline: "Premium party rentals for every occasion",
        localeDefault: "en",
        locales: ["en", "da"],
        currency: "DKK",
        timezone: "Europe/Copenhagen",
        country: "DK",
        taxMode: TaxMode.INCLUSIVE,
        taxPercentBps: 2500,
        paymentModel: PaymentModel.DEPOSIT_REMAINDER,
        depositPercentBps: 3000,
        supportEmail: "hello@demo.rentora.local",
        supportPhone: "+45 12 34 56 78",
        seoTitle: "Demo Events — Party Rentals",
        seoDescription: "Rent tents, tables, and lighting for your next event.",
      },
    }));

  await prisma.theme.upsert({
    where: { storeId: store.id },
    update: {},
    create: {
      tenantId: tenant.id,
      storeId: store.id,
      name: "Demo Default",
      tokens: {
        primary: "#0F766E",
        secondary: "#134E4A",
        accent: "#F59E0B",
        background: "#F8FAFC",
        foreground: "#0F172A",
        radius: "lg",
        density: "comfortable",
      },
    },
  });

  const owner = await prisma.staffUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "owner@demo.rentora.local" } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      email: "owner@demo.rentora.local",
      name: "Demo Owner",
      role: StaffRole.OWNER,
      passwordHash: hashPassword(staffPassword),
    },
  });

  await prisma.staffUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "crew@demo.rentora.local" } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      email: "crew@demo.rentora.local",
      name: "Warehouse Crew",
      role: StaffRole.STAFF,
      passwordHash: hashPassword(staffPassword),
    },
  });

  await prisma.location.upsert({
    where: { id: `${tenant.id}-main-warehouse` },
    update: {},
    create: {
      id: `${tenant.id}-main-warehouse`,
      tenantId: tenant.id,
      name: "Main Warehouse",
      address: "Eventvej 12",
      zipCode: "2100",
      city: "Copenhagen",
      country: "DK",
      latitude: 55.692,
      longitude: 12.572,
      isPrimary: true,
    },
  });

  for (const setting of [
    {
      type: DeliveryType.PICKUP,
      baseFeeMinor: 0,
      perKmFeeMinor: 0,
      notes: "Free pickup at warehouse",
    },
    {
      type: DeliveryType.DELIVERY,
      baseFeeMinor: 29900,
      perKmFeeMinor: 800,
      freeDeliveryKm: 5,
      maxDeliveryKm: 40,
      notes: "Standard van delivery",
    },
  ]) {
    await prisma.deliverySetting.upsert({
      where: { tenantId_type: { tenantId: tenant.id, type: setting.type } },
      update: {},
      create: { tenantId: tenant.id, currency: "DKK", ...setting },
    });
  }

  for (const def of STATUS_DEFS) {
    await prisma.bookingStatusDefinition.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: def.key } },
      update: { label: def.label, color: def.color, sortOrder: def.sortOrder },
      create: { tenantId: tenant.id, ...def },
    });
  }

  const categorySpecs = [
    { name: "Tents", slug: "tents", description: "Marquees and stretch tents", sortOrder: 0 },
    { name: "Furniture", slug: "furniture", description: "Tables, chairs, and bars", sortOrder: 1 },
    { name: "Lighting & sound", slug: "lighting-sound", description: "Festoon, uplights, PA", sortOrder: 2 },
  ];

  const categories: Record<string, string> = {};
  for (const spec of categorySpecs) {
    const cat = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: spec.slug } },
      update: { name: spec.name, description: spec.description, sortOrder: spec.sortOrder },
      create: { tenantId: tenant.id, ...spec },
    });
    categories[spec.slug] = cat.id;
  }

  const productSpecs = [
    {
      categorySlug: "tents",
      name: "6×12m Marquee",
      slug: "6x12m-marquee",
      description:
        "Classic white marquee for up to 80 seated guests. Includes sidewalls, ground stakes, and crew setup.",
      dailyPriceMinor: 250000,
      weekendPriceMinor: 320000,
      weekendPackageMinor: 550000,
      depositMinor: 500000,
      stockQty: 2,
      prepBufferDays: 1,
      cleanupBufferDays: 1,
      minRentalDays: 1,
      attributes: { capacity: 80, material: "PVC", area: "72 m²" },
      images: [
        { url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1600&q=80", alt: "White marquee at dusk" },
        { url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80", alt: "Marquee interior set for dinner" },
      ],
    },
    {
      categorySlug: "tents",
      name: "Stretch Tent 10×15m",
      slug: "stretch-tent-10x15",
      description: "Elegant free-form stretch tent for outdoor celebrations on uneven ground.",
      dailyPriceMinor: 320000,
      depositMinor: 600000,
      stockQty: 1,
      prepBufferDays: 1,
      cleanupBufferDays: 1,
      minRentalDays: 1,
      attributes: { capacity: 120, material: "Stretch fabric" },
      images: [
        { url: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1600&q=80", alt: "Stretch tent over a garden party" },
      ],
    },
    {
      categorySlug: "tents",
      name: "Pagoda 3×3m",
      slug: "pagoda-3x3",
      description: "Compact pagoda for registration desks, bars, or catering stations.",
      dailyPriceMinor: 45000,
      depositMinor: 100000,
      stockQty: 6,
      prepBufferDays: 0,
      cleanupBufferDays: 0,
      minRentalDays: 1,
      attributes: { capacity: 12 },
      images: [
        { url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1600&q=80", alt: "Small white pagoda tent" },
      ],
    },
    {
      categorySlug: "furniture",
      name: "Banquet Table 180cm",
      slug: "banquet-table-180",
      description: "Seats eight comfortably. Folding legs, wipe-clean top.",
      dailyPriceMinor: 6500,
      depositMinor: 0,
      stockQty: 40,
      prepBufferDays: 0,
      cleanupBufferDays: 0,
      minRentalDays: 1,
      attributes: { seats: 8 },
      images: [
        { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80", alt: "Long banquet tables set for a party" },
      ],
    },
    {
      categorySlug: "furniture",
      name: "Chiavari Chair",
      slug: "chiavari-chair",
      description: "Gold Chiavari chair with ivory seat pad. Stacked and delivered in tens.",
      dailyPriceMinor: 2500,
      weekendPriceMinor: 3200,
      depositMinor: 0,
      stockQty: 300,
      prepBufferDays: 0,
      cleanupBufferDays: 1,
      minRentalDays: 1,
      attributes: { finish: "Gold" },
      images: [
        { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80", alt: "Rows of gold chairs at a wedding" },
      ],
    },
    {
      categorySlug: "lighting-sound",
      name: "Festoon Lighting 20m",
      slug: "festoon-20m",
      description: "Warm-white festoon run with dimmer. Outdoor rated, 20 m per run.",
      dailyPriceMinor: 18000,
      depositMinor: 50000,
      stockQty: 12,
      prepBufferDays: 0,
      cleanupBufferDays: 1,
      minRentalDays: 1,
      attributes: { length: "20 m", ip: "IP44" },
      images: [
        { url: "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1600&q=80", alt: "Festoon lights strung over a terrace" },
      ],
    },
  ];

  const products: Record<string, string> = {};
  for (const spec of productSpecs) {
    const { categorySlug, images, attributes, ...rest } = spec;
    const product = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: spec.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: categories[categorySlug]!,
        currency: "DKK",
        attributes: attributes as Prisma.InputJsonObject,
        heroImageUrl: images[0]?.url,
        ...rest,
      },
    });
    products[spec.slug] = product.id;

    const existingImages = await prisma.productImage.count({ where: { productId: product.id } });
    if (existingImages === 0) {
      await prisma.productImage.createMany({
        data: images.map((img, i) => ({ productId: product.id, ...img, sortOrder: i })),
      });
    }
  }

  const marqueeId = products["6x12m-marquee"]!;

  const existingUnits = await prisma.productUnit.count({ where: { productId: marqueeId } });
  if (existingUnits === 0) {
    await prisma.productUnit.createMany({
      data: [
        { productId: marqueeId, sku: "MARQ-612-A", serial: "A-001" },
        { productId: marqueeId, sku: "MARQ-612-B", serial: "B-001" },
      ],
    });
  }

  // A maintenance window that the storefront calendar must show as unavailable.
  const existingBlackouts = await prisma.blackoutDate.count({ where: { productId: marqueeId } });
  if (existingBlackouts === 0) {
    await prisma.blackoutDate.create({
      data: {
        productId: marqueeId,
        startDate: daysFromToday(21),
        endDate: daysFromToday(24),
        reason: "Annual re-proofing at the supplier",
      },
    });
  }

  for (const spec of [
    { name: "Setup & takedown crew", slug: "setup-crew", priceMinor: 120000, description: "Two-person crew, up to 4 hours." },
    { name: "Patio heater", slug: "patio-heater", priceMinor: 35000, description: "Gas heater with full bottle." },
    { name: "Dance floor 4×4m", slug: "dance-floor-4x4", priceMinor: 180000, description: "Oak-effect modular floor." },
  ]) {
    await prisma.upsellProduct.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: spec.slug } },
      update: {},
      create: { tenantId: tenant.id, currency: "DKK", ...spec },
    });
  }

  const setupCrew = await prisma.upsellProduct.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "setup-crew" } },
  });
  if (setupCrew) {
    for (const productSlug of ["6x12m-marquee", "stretch-tent-10x15"]) {
      await prisma.productUpsell.upsert({
        where: {
          productId_upsellProductId: {
            productId: products[productSlug]!,
            upsellProductId: setupCrew.id,
          },
        },
        update: {},
        create: { productId: products[productSlug]!, upsellProductId: setupCrew.id },
      });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "maja@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "maja@example.com",
      passwordHash: hashPassword(customerPassword),
      firstName: "Maja",
      lastName: "Sørensen",
      phone: "+45 20 11 22 33",
      address: "Nørrebrogade 42",
      zipCode: "2200",
      city: "Copenhagen",
      country: "DK",
      emailVerified: true,
    },
  });

  for (const page of CMS_PAGES) {
    await prisma.cmsPage.upsert({
      where: { tenantId_slug_locale: { tenantId: tenant.id, slug: page.slug, locale: "en" } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: page.slug,
        title: page.title,
        locale: "en",
        sections: page.sections as unknown as Prisma.InputJsonValue,
        isPublished: true,
        seoTitle: `${page.title} — Demo Events`,
      },
    });
  }

  for (const template of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: {
        tenantId_key_locale: { tenantId: tenant.id, key: template.key, locale: "en" },
      },
      update: {},
      create: { tenantId: tenant.id, locale: "en", ...template },
    });
  }

  await seedBookings(tenant.id, store.currency, customer.id, products);

  console.log("Seed complete.");
  console.log(`  platform   admin@rentora.app / ${platformPassword}`);
  console.log(`  staff      owner@demo.rentora.local / ${staffPassword} (OWNER)`);
  console.log(`  staff      crew@demo.rentora.local / ${staffPassword} (STAFF)`);
  console.log(`  customer   maja@example.com / ${customerPassword}`);
  console.log(`  tenant     ${tenant.slug} (${tenant.id})`);
  console.log(`  owner id   ${owner.id}`);
  console.log("  storefront http://demo.localhost:3000");
}

async function seedBookings(
  tenantId: string,
  currency: string,
  customerId: string,
  products: Record<string, string>,
) {
  const specs = [
    {
      bookingNo: "RNT-DEMO-0001",
      statusKey: "fully_paid",
      source: BookingSource.ONLINE,
      customerId,
      customerName: "Maja Sørensen",
      email: "maja@example.com",
      phone: "+45 20 11 22 33",
      address: "Nørrebrogade 42",
      zipCode: "2200",
      city: "Copenhagen",
      startDate: daysFromToday(7),
      endDate: daysFromToday(9),
      deliveryType: DeliveryType.DELIVERY,
      deliveryFeeMinor: 34900,
      notes: "Gate code 4412. Crew can access from the courtyard.",
      items: [
        { slug: "6x12m-marquee", quantity: 1, unitPriceMinor: 250000 },
        { slug: "chiavari-chair", quantity: 60, unitPriceMinor: 2500 },
      ],
    },
    {
      bookingNo: "RNT-DEMO-0002",
      statusKey: "deposit_paid",
      source: BookingSource.MANUAL,
      customerId: null,
      customerName: "Jonas Holm",
      email: "jonas@example.com",
      phone: "+45 30 44 55 66",
      address: "Havnegade 8",
      zipCode: "1058",
      city: "Copenhagen",
      startDate: daysFromToday(14),
      endDate: daysFromToday(16),
      deliveryType: DeliveryType.PICKUP,
      deliveryFeeMinor: 0,
      notes: "Company summer party. Invoice to accounts@example.com.",
      items: [
        { slug: "stretch-tent-10x15", quantity: 1, unitPriceMinor: 320000 },
        { slug: "festoon-20m", quantity: 4, unitPriceMinor: 18000 },
        { slug: "banquet-table-180", quantity: 12, unitPriceMinor: 6500 },
      ],
    },
  ];

  for (const spec of specs) {
    const existing = await prisma.booking.findUnique({
      where: { tenantId_bookingNo: { tenantId, bookingNo: spec.bookingNo } },
    });
    if (existing) continue;

    const { items, ...booking } = spec;
    const days =
      Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / DAY) + 1;

    const subtotalMinor = items.reduce((sum, i) => sum + i.unitPriceMinor * i.quantity * days, 0);
    const depositMinor = 0;
    const totalMinor = subtotalMinor + booking.deliveryFeeMinor;
    const upfrontMinor = spec.statusKey === "deposit_paid" ? Math.round(totalMinor * 0.3) : totalMinor;

    await prisma.booking.create({
      data: {
        tenantId,
        currency,
        country: "DK",
        subtotalMinor,
        taxMinor: 0,
        depositMinor,
        totalMinor,
        upfrontMinor,
        remainingMinor: totalMinor - upfrontMinor,
        ...booking,
        items: {
          create: items.map((item) => ({
            productId: products[item.slug]!,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            nameSnapshot: item.slug,
          })),
        },
      },
    });
  }

  // Snapshot names should read like the product, not the slug.
  const bookingItems = await prisma.bookingItem.findMany({
    where: { booking: { tenantId } },
    include: { product: true },
  });
  for (const item of bookingItems) {
    if (item.nameSnapshot !== item.product.name) {
      await prisma.bookingItem.update({
        where: { id: item.id },
        data: { nameSnapshot: item.product.name },
      });
    }
  }

  console.log(`  bookings   seeded through ${isoDate(daysFromToday(16))}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
