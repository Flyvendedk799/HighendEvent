import { createHash, randomBytes } from "node:crypto";
import {
  PrismaClient,
  PlanTier,
  StaffRole,
  DeliveryType,
  PaymentModel,
  TaxMode,
} from "@prisma/client";

const prisma = new PrismaClient();

/** Matches apps/api hashPassword: sha256$salt$hash (non-legacy verify path). */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `sha256$${salt}$${hash}`;
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
    console.log(`Demo tenant already exists: ${existing.id} (${existing.slug})`);
    console.log("Platform user: admin@rentora.app / admin123");
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
      bodyHtml: "<p>Thanks for booking with {{storeName}}.</p>",
    },
  });

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
