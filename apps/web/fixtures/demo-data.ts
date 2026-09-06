/**
 * Test/Storybook fixtures only — not imported by production app routes.
 */
import type {
  StoreBlackout,
  StoreOccupancy,
  StoreProduct,
} from "@/lib/product-model";

export const demoProducts: StoreProduct[] = [
  {
    id: "1",
    slug: "champagne-tower",
    name: "Champagne Tower",
    category: "Glassware",
    priceFrom: 89000,
    weekendPrice: 99000,
    weekendPackage: 249000,
    deposit: 50000,
    currency: "DKK",
    stock: 4,
    prepBufferDays: 1,
    cleanupBufferDays: 1,
    description: "Six-tier acrylic champagne tower for receptions and celebrations.",
    longDescription:
      "A show-stopping six-tier acrylic champagne tower that pours evenly across glasses for dramatic reception moments.",
    specs: [
      { label: "Height", value: "90 cm" },
      { label: "Capacity", value: "54 flutes" },
    ],
    imageTone: "teal",
    galleryLabels: ["Hero", "Detail", "In use"],
  },
];

export const demoOccupancy: StoreOccupancy[] = [
  {
    id: "b1",
    bookingNo: "RNT-1001",
    productId: "1",
    quantity: 2,
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    statusKey: "fully_paid",
  },
];

export const demoBlackouts: StoreBlackout[] = [
  { productId: "1", startDate: "2026-09-28", endDate: "2026-09-29", reason: "Maintenance" },
];
