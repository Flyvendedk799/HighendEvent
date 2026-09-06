export type DemoProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceFrom: number;
  weekendPrice?: number;
  weekendPackage?: number;
  deposit?: number;
  currency: string;
  stock: number;
  prepBufferDays: number;
  cleanupBufferDays: number;
  description: string;
  longDescription: string;
  specs: { label: string; value: string }[];
  imageTone: "teal" | "amber" | "slate";
  galleryLabels: string[];
};

export type DemoOccupancy = {
  id: string;
  bookingNo: string;
  productId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  statusKey: string;
};

export type DemoBlackout = {
  productId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export const demoProducts: DemoProduct[] = [
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
      "A show-stopping six-tier acrylic champagne tower that pours evenly across glasses for dramatic reception moments. Includes stabilising base plate and packing crates for safe transport.",
    specs: [
      { label: "Height", value: "90 cm" },
      { label: "Capacity", value: "54 flutes" },
      { label: "Material", value: "Food-grade acrylic" },
      { label: "Includes", value: "Base plate + crates" },
    ],
    imageTone: "teal",
    galleryLabels: ["Hero", "Detail", "In use"],
  },
  {
    id: "2",
    slug: "lounge-set-ivory",
    name: "Ivory Lounge Set",
    category: "Furniture",
    priceFrom: 145000,
    weekendPrice: 165000,
    weekendPackage: 420000,
    deposit: 150000,
    currency: "DKK",
    stock: 6,
    prepBufferDays: 1,
    cleanupBufferDays: 1,
    description: "Modular ivory lounge seating for 12 guests with side tables.",
    longDescription:
      "Soft modular lounge seating in warm ivory fabric. Configures as a conversation pit for up to 12 guests with matching side tables and outdoor-safe cushions.",
    specs: [
      { label: "Seats", value: "12 guests" },
      { label: "Modules", value: "8 pieces" },
      { label: "Finish", value: "Ivory performance fabric" },
      { label: "Outdoor", value: "Covered areas OK" },
    ],
    imageTone: "amber",
    galleryLabels: ["Set", "Corner", "Detail"],
  },
  {
    id: "3",
    slug: "fairy-light-canopy",
    name: "Fairy Light Canopy",
    category: "Lighting",
    priceFrom: 65000,
    weekendPrice: 75000,
    deposit: 30000,
    currency: "DKK",
    stock: 10,
    prepBufferDays: 0,
    cleanupBufferDays: 0,
    description: "Warm canopy string lights covering up to 40 m² outdoor space.",
    longDescription:
      "Warm-white canopy string lights with commercial-grade cabling. Covers up to 40 m² and includes hanging kit for tents, beams, or garden posts.",
    specs: [
      { label: "Coverage", value: "Up to 40 m²" },
      { label: "Colour", value: "2700K warm white" },
      { label: "Power", value: "230V / outdoor rated" },
      { label: "Kit", value: "Hooks + extension" },
    ],
    imageTone: "slate",
    galleryLabels: ["Canopy", "Close-up", "Night"],
  },
  {
    id: "4",
    slug: "slush-machine-pro",
    name: "Slush Machine Pro",
    category: "Machines",
    priceFrom: 99500,
    weekendPrice: 119000,
    weekendPackage: 299000,
    deposit: 100000,
    currency: "DKK",
    stock: 8,
    prepBufferDays: 1,
    cleanupBufferDays: 1,
    description: "Dual-tank commercial slush machine with syrup starter kit.",
    longDescription:
      "Dual-tank commercial slush machine for high-volume events. Includes starter syrups, drip trays, and a quick-clean guide for staff.",
    specs: [
      { label: "Tanks", value: "2 × 12 L" },
      { label: "Output", value: "~200 cups/hour" },
      { label: "Power", value: "230V" },
      { label: "Includes", value: "Syrup starter kit" },
    ],
    imageTone: "teal",
    galleryLabels: ["Machine", "Serving", "Detail"],
  },
  {
    id: "5",
    slug: "round-table-180",
    name: "Round Table 180cm",
    category: "Furniture",
    priceFrom: 22000,
    deposit: 15000,
    currency: "DKK",
    stock: 24,
    prepBufferDays: 0,
    cleanupBufferDays: 0,
    description: "Banquet round table seating 8–10 guests, white linen optional.",
    longDescription:
      "Sturdy banquet round table (180 cm) seating 8–10 guests. Folding legs for easy logistics. White linen available as an add-on.",
    specs: [
      { label: "Diameter", value: "180 cm" },
      { label: "Seats", value: "8–10" },
      { label: "Weight", value: "28 kg" },
      { label: "Add-on", value: "White linen" },
    ],
    imageTone: "amber",
    galleryLabels: ["Table", "Set", "Folded"],
  },
  {
    id: "6",
    slug: "photo-booth-mirror",
    name: "Mirror Photo Booth",
    category: "Entertainment",
    priceFrom: 249000,
    weekendPrice: 279000,
    weekendPackage: 699000,
    deposit: 250000,
    currency: "DKK",
    stock: 2,
    prepBufferDays: 1,
    cleanupBufferDays: 1,
    description: "Interactive mirror booth with custom branding overlays.",
    longDescription:
      "Interactive full-length mirror booth with touch UI, custom overlays, GIF/print delivery, and attendant training pack.",
    specs: [
      { label: "Prints", value: "Unlimited during rental" },
      { label: "Branding", value: "Custom overlays" },
      { label: "Power", value: "230V" },
      { label: "Footprint", value: "1.2 × 1.0 m" },
    ],
    imageTone: "slate",
    galleryLabels: ["Mirror", "UI", "Prints"],
  },
];

/** Occupancy used by the availability calendar / pricing checks */
export const demoOccupancy: DemoOccupancy[] = [
  {
    id: "b1",
    bookingNo: "RNT-1001",
    productId: "1",
    quantity: 2,
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    statusKey: "fully_paid",
  },
  {
    id: "b2",
    bookingNo: "RNT-1002",
    productId: "1",
    quantity: 2,
    startDate: "2026-09-20",
    endDate: "2026-09-21",
    statusKey: "deposit_paid",
  },
  {
    id: "b3",
    bookingNo: "RNT-1003",
    productId: "2",
    quantity: 4,
    startDate: "2026-09-18",
    endDate: "2026-09-20",
    statusKey: "fully_paid",
  },
  {
    id: "b4",
    bookingNo: "RNT-1004",
    productId: "4",
    quantity: 5,
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    statusKey: "out_for_delivery",
  },
  {
    id: "b5",
    bookingNo: "RNT-1005",
    productId: "6",
    quantity: 2,
    startDate: "2026-09-12",
    endDate: "2026-09-13",
    statusKey: "fully_paid",
  },
];

export const demoBlackouts: DemoBlackout[] = [
  { productId: "1", startDate: "2026-09-28", endDate: "2026-09-29", reason: "Maintenance" },
  { productId: "3", startDate: "2026-09-15", endDate: "2026-09-16", reason: "Warehouse closed" },
  { productId: "6", startDate: "2026-09-22", endDate: "2026-09-23", reason: "Software update" },
];

/** Admin / account list rows (display only) */
export const demoBookings = [
  {
    id: "BK-1042",
    customer: "Maja Nielsen",
    status: "Confirmed",
    start: "2026-09-12",
    end: "2026-09-14",
    total: "4.280 DKK",
  },
  {
    id: "BK-1041",
    customer: "Event House ApS",
    status: "Deposit paid",
    start: "2026-09-18",
    end: "2026-09-19",
    total: "12.900 DKK",
  },
  {
    id: "BK-1038",
    customer: "Jonas Holm",
    status: "Out for delivery",
    start: "2026-09-06",
    end: "2026-09-07",
    total: "2.150 DKK",
  },
];

export function formatPrice(amountMinor: number, currency: string, locale = "da-DK"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function productAvailabilityInput(product: DemoProduct) {
  return {
    id: product.id,
    stockQty: product.stock,
    prepBufferDays: product.prepBufferDays,
    cleanupBufferDays: product.cleanupBufferDays,
    isActive: true,
  };
}

export function productPricingInput(product: DemoProduct) {
  return {
    id: product.id,
    name: product.name,
    dailyPriceMinor: product.priceFrom,
    weekendPriceMinor: product.weekendPrice ?? null,
    weekendPackageMinor: product.weekendPackage ?? null,
    depositMinor: product.deposit ?? 0,
    currency: product.currency,
    isActive: true,
  };
}

export function bookingsForProduct(productId: string) {
  return demoOccupancy.filter((b) => b.productId === productId);
}

export function blackoutsForProduct(productId: string) {
  return demoBlackouts.filter((b) => b.productId === productId);
}
