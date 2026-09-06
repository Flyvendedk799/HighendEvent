export type DemoProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceFrom: number;
  currency: string;
  stock: number;
  description: string;
  imageTone: "teal" | "amber" | "slate";
};

export const demoProducts: DemoProduct[] = [
  {
    id: "1",
    slug: "champagne-tower",
    name: "Champagne Tower",
    category: "Glassware",
    priceFrom: 89000,
    currency: "DKK",
    stock: 4,
    description: "Six-tier acrylic champagne tower for receptions and celebrations.",
    imageTone: "teal",
  },
  {
    id: "2",
    slug: "lounge-set-ivory",
    name: "Ivory Lounge Set",
    category: "Furniture",
    priceFrom: 145000,
    currency: "DKK",
    stock: 6,
    description: "Modular ivory lounge seating for 12 guests with side tables.",
    imageTone: "amber",
  },
  {
    id: "3",
    slug: "fairy-light-canopy",
    name: "Fairy Light Canopy",
    category: "Lighting",
    priceFrom: 65000,
    currency: "DKK",
    stock: 10,
    description: "Warm canopy string lights covering up to 40 m² outdoor space.",
    imageTone: "slate",
  },
  {
    id: "4",
    slug: "slush-machine-pro",
    name: "Slush Machine Pro",
    category: "Machines",
    priceFrom: 99500,
    currency: "DKK",
    stock: 8,
    description: "Dual-tank commercial slush machine with syrup starter kit.",
    imageTone: "teal",
  },
  {
    id: "5",
    slug: "round-table-180",
    name: "Round Table 180cm",
    category: "Furniture",
    priceFrom: 22000,
    currency: "DKK",
    stock: 24,
    description: "Banquet round table seating 8–10 guests, white linen optional.",
    imageTone: "amber",
  },
  {
    id: "6",
    slug: "photo-booth-mirror",
    name: "Mirror Photo Booth",
    category: "Entertainment",
    priceFrom: 249000,
    currency: "DKK",
    stock: 2,
    description: "Interactive mirror booth with custom branding overlays.",
    imageTone: "slate",
  },
];

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
