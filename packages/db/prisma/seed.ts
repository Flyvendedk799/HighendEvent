import { createHash, randomBytes } from "node:crypto";
import {
  PrismaClient,
  PlanTier,
  StaffRole,
  DeliveryType,
  PaymentModel,
  TaxMode,
  BookingSource,
} from "@prisma/client";

const prisma = new PrismaClient();

/** Matches apps/api hashPassword: sha256$salt$hash (non-legacy verify path). */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `sha256$${salt}$${hash}`;
}


const PRODUCT_MEDIA: Record<string, { hero: string; gallery: string[] }> = {
  "6x12m-marquee": {
    hero: "https://images.unsplash.com/photo-1519167758481-83f29da8c2b4?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
      "https://images.unsplash.com/photo-1478144592103-25e218a048ae?w=800&q=80",
    ],
  },
  "stretch-tent-10x15": {
    hero: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80",
    gallery: ["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"],
  },
  "pagoda-3x3": {
    hero: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
    gallery: ["https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80"],
  },
  "banquet-table-180": {
    hero: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    gallery: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"],
  },
  "string-lights-20m": {
    hero: "https://images.unsplash.com/photo-1513279922550-250740418a1d?w=1200&q=80",
    gallery: ["https://images.unsplash.com/photo-1482575832494-771f74bf6857?w=800&q=80"],
  },
};

async function enrichDemoTenant(tenantId: string) {
  let furniture = await prisma.category.findUnique({
    where: { tenantId_slug: { tenantId, slug: "furniture" } },
  });
  if (!furniture) {
    furniture = await prisma.category.create({
      data: {
        tenantId,
        name: "Furniture",
        slug: "furniture",
        description: "Tables, chairs, and lounge",
        sortOrder: 1,
      },
    });
  }

  let lighting = await prisma.category.findUnique({
    where: { tenantId_slug: { tenantId, slug: "lighting" } },
  });
  if (!lighting) {
    lighting = await prisma.category.create({
      data: {
        tenantId,
        name: "Lighting",
        slug: "lighting",
        description: "Ambient and functional lighting",
        sortOrder: 2,
      },
    });
  }

  for (const extra of [
    {
      categoryId: furniture.id,
      name: "Banquet Table 180cm",
      slug: "banquet-table-180",
      description: "Solid banquet table seats 8–10.",
      dailyPriceMinor: 12000,
      depositMinor: 25000,
      stockQty: 20,
    },
    {
      categoryId: lighting.id,
      name: "String Lights 20m",
      slug: "string-lights-20m",
      description: "Warm white festoon string lights.",
      dailyPriceMinor: 8000,
      depositMinor: 15000,
      stockQty: 15,
    },
  ]) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId, slug: extra.slug } },
      update: {
        name: extra.name,
        description: extra.description,
        dailyPriceMinor: extra.dailyPriceMinor,
        depositMinor: extra.depositMinor,
        stockQty: extra.stockQty,
        isActive: true,
      },
      create: {
        tenantId,
        categoryId: extra.categoryId,
        name: extra.name,
        slug: extra.slug,
        description: extra.description,
        dailyPriceMinor: extra.dailyPriceMinor,
        depositMinor: extra.depositMinor,
        currency: "DKK",
        stockQty: extra.stockQty,
        prepBufferDays: 0,
        cleanupBufferDays: 0,
        minRentalDays: 1,
        attributes: {},
      },
    });
  }

  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      heroImageUrl: true,
      dailyPriceMinor: true,
      depositMinor: true,
      currency: true,
    },
  });

  for (const product of products) {
    const media = PRODUCT_MEDIA[product.slug];
    if (!media) continue;
    if (!product.heroImageUrl) {
      await prisma.product.update({
        where: { id: product.id },
        data: { heroImageUrl: media.hero },
      });
    }
    const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imageCount === 0) {
      await prisma.productImage.createMany({
        data: [
          { productId: product.id, url: media.hero, alt: product.name, sortOrder: 0 },
          ...media.gallery.map((url, idx) => ({
            productId: product.id,
            url,
            alt: `${product.name} detail ${idx + 1}`,
            sortOrder: idx + 1,
          })),
        ],
      });
    }
  }

  const marquee = products.find((p) => p.slug === "6x12m-marquee");
  if (marquee) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 21);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 2);
    const existingBlackout = await prisma.blackoutDate.findFirst({
      where: { productId: marquee.id, reason: "Warehouse maintenance (seed)" },
    });
    if (!existingBlackout) {
      await prisma.blackoutDate.create({
        data: {
          productId: marquee.id,
          startDate: start,
          endDate: end,
          reason: "Warehouse maintenance (seed)",
        },
      });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email: "customer@demo.rentora.local" } },
    update: {
      passwordHash: hashPassword("customer123"),
      firstName: "Alex",
      lastName: "Customer",
      phone: "+45 98 76 54 32",
      address: "Nørrebrogade 45",
      zipCode: "2200",
      city: "Copenhagen",
      country: "DK",
      isGuest: false,
      emailVerified: true,
      isActive: true,
    },
    create: {
      tenantId,
      email: "customer@demo.rentora.local",
      passwordHash: hashPassword("customer123"),
      firstName: "Alex",
      lastName: "Customer",
      phone: "+45 98 76 54 32",
      address: "Nørrebrogade 45",
      zipCode: "2200",
      city: "Copenhagen",
      country: "DK",
      isGuest: false,
      emailVerified: true,
      isActive: true,
    },
  });

  const bookingCount = await prisma.booking.count({ where: { tenantId, isDeleted: false } });
  if (bookingCount === 0 && marquee) {
    const pagoda = products.find((p) => p.slug === "pagoda-3x3");
    const startPaid = new Date();
    startPaid.setUTCDate(startPaid.getUTCDate() + 14);
    startPaid.setUTCHours(0, 0, 0, 0);
    const endPaid = new Date(startPaid);
    endPaid.setUTCDate(endPaid.getUTCDate() + 1);

    const paidSubtotal = marquee.dailyPriceMinor * 2;
    const paidTax = Math.round(paidSubtotal * 0.25);
    const paidTotal = paidSubtotal + paidTax;
    const paidUpfront = Math.round(paidTotal * 0.3) + marquee.depositMinor;
    const paidRemaining = Math.max(0, paidTotal + marquee.depositMinor - paidUpfront);

    await prisma.booking.create({
      data: {
        tenantId,
        bookingNo: "RNT-SEED-1001",
        customerId: customer.id,
        source: BookingSource.ONLINE,
        customerName: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone ?? "+45 98 76 54 32",
        address: customer.address ?? "Nørrebrogade 45",
        zipCode: customer.zipCode ?? "2200",
        city: customer.city ?? "Copenhagen",
        country: customer.country ?? "DK",
        startDate: startPaid,
        endDate: endPaid,
        currency: marquee.currency,
        subtotalMinor: paidSubtotal,
        taxMinor: paidTax,
        depositMinor: marquee.depositMinor,
        deliveryFeeMinor: 0,
        totalMinor: paidTotal,
        upfrontMinor: paidUpfront,
        remainingMinor: paidRemaining,
        statusKey: "deposit_paid",
        deliveryType: DeliveryType.PICKUP,
        stripeSessionId: "cs_test_stub_seed_deposit",
        stripePaymentIntentId: "pi_seed_deposit",
        notes: "Wedding reception — unload at rear gate.",
        internalNotes: "Confirm forklift Saturday 08:00.",
        items: {
          create: [
            {
              productId: marquee.id,
              quantity: 1,
              unitPriceMinor: marquee.dailyPriceMinor,
              nameSnapshot: marquee.name,
            },
          ],
        },
      },
    });

    if (pagoda) {
      const startPending = new Date();
      startPending.setUTCDate(startPending.getUTCDate() + 28);
      startPending.setUTCHours(0, 0, 0, 0);
      const endPending = new Date(startPending);
      endPending.setUTCDate(endPending.getUTCDate() + 2);
      const pendingSubtotal = pagoda.dailyPriceMinor * 3;
      const pendingTax = Math.round(pendingSubtotal * 0.25);
      const pendingTotal = pendingSubtotal + pendingTax + 29900;

      await prisma.booking.create({
        data: {
          tenantId,
          bookingNo: "RNT-SEED-1002",
          customerId: customer.id,
          source: BookingSource.ONLINE,
          customerName: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone ?? "+45 98 76 54 32",
          address: customer.address ?? "Nørrebrogade 45",
          zipCode: customer.zipCode ?? "2200",
          city: customer.city ?? "Copenhagen",
          country: customer.country ?? "DK",
          startDate: startPending,
          endDate: endPending,
          currency: pagoda.currency,
          subtotalMinor: pendingSubtotal,
          taxMinor: pendingTax,
          depositMinor: pagoda.depositMinor,
          deliveryFeeMinor: 29900,
          totalMinor: pendingTotal,
          upfrontMinor: pendingTotal + pagoda.depositMinor,
          remainingMinor: 0,
          statusKey: "pending",
          deliveryType: DeliveryType.DELIVERY,
          notes: "Awaiting deposit payment.",
          items: {
            create: [
              {
                productId: pagoda.id,
                quantity: 2,
                unitPriceMinor: pagoda.dailyPriceMinor,
                nameSnapshot: pagoda.name,
              },
            ],
          },
        },
      });
    }
  }

  return { productCount: products.length, customerEmail: customer.email };
}


async function main() {
  await prisma.platformUser.upsert({
    where: { email: "admin@rentora.app" },
    update: {
      passwordHash: hashPassword("admin123"),
      name: "Platform Admin",
      isActive: true,
    },
    create: {
      email: "admin@rentora.app",
      name: "Platform Admin",
      passwordHash: hashPassword("admin123"),
      isActive: true,
    },
  });

  const slug = "demo";
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    const enriched = await enrichDemoTenant(existing.id);
    console.log(`Demo tenant already exists: ${existing.id} (${existing.slug})`);
    console.log(`Enriched catalog: ${enriched.productCount} products, customer ${enriched.customerEmail}`);
    console.log("Platform user: admin@rentora.app / admin123");
    console.log("Staff: owner@demo.rentora.local / demo1234");
    console.log("Customer: customer@demo.rentora.local / customer123");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Events",
      slug,
      plan: PlanTier.GROWTH,
      applicationFeeBps: 250,
      featureFlags: {
        customDomains: true,
        upsells: true,
        deliveryZones: true,
      },
      stores: {
        create: {
          name: "Demo Events Storefront",
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
      },
      staff: {
        create: {
          email: "owner@demo.rentora.local",
          name: "Demo Owner",
          role: StaffRole.OWNER,
          passwordHash: hashPassword("demo1234"),
        },
      },
      locations: {
        create: {
          name: "Main Warehouse",
          address: "Eventvej 12",
          zipCode: "2100",
          city: "Copenhagen",
          country: "DK",
          latitude: 55.692,
          longitude: 12.572,
          isPrimary: true,
        },
      },
      deliverySettings: {
        create: [
          {
            type: DeliveryType.PICKUP,
            baseFeeMinor: 0,
            currency: "DKK",
            notes: "Free pickup at warehouse",
          },
          {
            type: DeliveryType.DELIVERY,
            baseFeeMinor: 29900,
            perKmFeeMinor: 800,
            freeDeliveryKm: 5,
            maxDeliveryKm: 40,
            currency: "DKK",
            notes: "Standard van delivery",
          },
        ],
      },
      statusDefs: {
        create: [
          { key: "pending", label: "Pending payment", color: "#F59E0B", sortOrder: 0 },
          { key: "deposit_paid", label: "Deposit paid", color: "#3B82F6", sortOrder: 1 },
          { key: "fully_paid", label: "Fully paid", color: "#10B981", sortOrder: 2 },
          { key: "out_for_delivery", label: "Out for delivery", color: "#8B5CF6", sortOrder: 3 },
          { key: "returned_good", label: "Returned (good)", color: "#14B8A6", sortOrder: 4 },
          { key: "returned_damaged", label: "Returned (damaged)", color: "#EF4444", sortOrder: 5 },
          {
            key: "deposit_refunded",
            label: "Deposit refunded",
            color: "#64748B",
            sortOrder: 6,
            isTerminal: true,
          },
          {
            key: "cancelled",
            label: "Cancelled",
            color: "#DC2626",
            sortOrder: 7,
            isTerminal: true,
          },
        ],
      },
      categories: {
        create: {
          name: "Tents",
          slug: "tents",
          description: "Marquees and stretch tents",
          sortOrder: 0,
        },
      },
    },
    include: {
      stores: true,
      categories: true,
    },
  });

  const category = tenant.categories[0]!;
  const store = tenant.stores[0]!;

  await prisma.theme.create({
    data: {
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

  await prisma.product.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "6×12m Marquee",
        slug: "6x12m-marquee",
        description: "Classic white marquee for up to 80 guests.",
        dailyPriceMinor: 250000,
        weekendPriceMinor: 320000,
        weekendPackageMinor: 550000,
        depositMinor: 500000,
        currency: "DKK",
        stockQty: 2,
        prepBufferDays: 1,
        cleanupBufferDays: 1,
        minRentalDays: 1,
        attributes: { capacity: 80, material: "PVC" },
      },
      {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "Stretch Tent 10×15m",
        slug: "stretch-tent-10x15",
        description: "Elegant stretch tent for outdoor celebrations.",
        dailyPriceMinor: 320000,
        depositMinor: 600000,
        currency: "DKK",
        stockQty: 1,
        prepBufferDays: 1,
        cleanupBufferDays: 1,
        minRentalDays: 1,
        attributes: { capacity: 120 },
      },
      {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "Pagoda 3×3m",
        slug: "pagoda-3x3",
        description: "Compact pagoda for registration or catering.",
        dailyPriceMinor: 45000,
        depositMinor: 100000,
        currency: "DKK",
        stockQty: 6,
        prepBufferDays: 0,
        cleanupBufferDays: 0,
        minRentalDays: 1,
        attributes: { capacity: 12 },
      },
    ],
  });

  const marquee = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "6x12m-marquee" } },
  });
  if (marquee) {
    await prisma.productUnit.createMany({
      data: [
        { productId: marquee.id, sku: "MARQ-612-A", serial: "A-001" },
        { productId: marquee.id, sku: "MARQ-612-B", serial: "B-001" },
      ],
    });
  }

  await prisma.emailTemplate.create({
    data: {
      tenantId: tenant.id,
      key: "booking_confirmation",
      locale: "en",
      subject: "Your booking is confirmed",
      bodyHtml: "<p>Thanks for booking with {{storeName}}.</p><p>Booking {{bookingNo}} for {{customerName}}.</p>",
    },
  });

  await prisma.cmsPage.createMany({
    data: [
      {
        tenantId: tenant.id,
        slug: "about",
        title: "About us",
        locale: "en",
        isPublished: true,
        seoTitle: "About",
        seoDescription: "About our rental company",
        sections: [
          {
            type: "text",
            heading: "We rent the good stuff",
            body: "Demo Rentals supplies marquees, furniture, and event gear across Denmark.",
          },
        ],
      },
      {
        tenantId: tenant.id,
        slug: "faq",
        title: "FAQ",
        locale: "en",
        isPublished: true,
        seoTitle: "FAQ",
        sections: [
          {
            type: "text",
            heading: "How does delivery work?",
            body: "Choose delivery at checkout. Fees are calculated from your address.",
          },
          {
            type: "text",
            heading: "Can I change dates?",
            body: "Contact support before the prep buffer starts and we will re-check availability.",
          },
        ],
      },
      {
        tenantId: tenant.id,
        slug: "terms",
        title: "Terms",
        locale: "en",
        isPublished: true,
        seoTitle: "Terms of rental",
        sections: [
          {
            type: "text",
            heading: "Rental terms",
            body: "Equipment must be returned clean and undamaged. Deposits may be withheld for damage.",
          },
        ],
      },
    ],
  });

  await enrichDemoTenant(tenant.id);

  console.log("Seeded platform user admin@rentora.app / admin123");
  console.log("Seeded demo tenant:");
  console.log(`  tenantId: ${tenant.id}`);
  console.log(`  slug:     ${tenant.slug}`);
  console.log(`  store:    ${store.name}`);
  console.log(`  staff:    owner@demo.rentora.local / demo1234`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
