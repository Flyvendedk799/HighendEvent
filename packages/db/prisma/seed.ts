import { PrismaClient, PlanTier, StaffRole, DeliveryType, PaymentModel, TaxMode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = "demo";

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Demo tenant already exists: ${existing.id} (${existing.slug})`);
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
          // password: "demo1234" — hash at auth wiring time
          passwordHash: null,
        },
      },
      locations: {
        create: {
          name: "Main Warehouse",
          address: "Eventvej 12",
          zipCode: "2100",
          city: "Copenhagen",
          country: "DK",
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
          { key: "pending", label: "Pending", color: "#F59E0B", sortOrder: 0 },
          { key: "confirmed", label: "Confirmed", color: "#0F766E", sortOrder: 1 },
          { key: "out_for_delivery", label: "Out for delivery", color: "#0284C7", sortOrder: 2 },
          { key: "returned", label: "Returned", color: "#64748B", sortOrder: 3, isTerminal: true },
          { key: "cancelled", label: "Cancelled", color: "#DC2626", sortOrder: 4, isTerminal: true },
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

  const category = tenant.categories[0];
  const store = tenant.stores[0];

  await prisma.theme.create({
    data: {
      tenantId: tenant.id,
      storeId: store.id,
      name: "Demo Default",
      tokens: {
        radius: "lg",
        density: "comfortable",
      },
    },
  });

  await prisma.product.create({
    data: {
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
      heroImageUrl: null,
      attributes: { capacity: 80, material: "PVC" },
      units: {
        create: [
          { sku: "MARQ-612-A", serial: "A-001" },
          { sku: "MARQ-612-B", serial: "B-001" },
        ],
      },
    },
  });

  await prisma.emailTemplate.create({
    data: {
      tenantId: tenant.id,
      key: "booking_confirmation",
      locale: "en",
      subject: "Your booking is confirmed",
      bodyHtml: "<p>Thanks for booking with {{storeName}}.</p>",
    },
  });

  console.log("Seeded demo tenant:");
  console.log(`  tenantId: ${tenant.id}`);
  console.log(`  slug:     ${tenant.slug}`);
  console.log(`  store:    ${store.name}`);
  console.log(`  staff:    owner@demo.rentora.local`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
