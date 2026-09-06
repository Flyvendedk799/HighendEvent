import type { DemoProduct } from "@/lib/demo-data";

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  dailyPriceMinor: number;
  weekendPriceMinor?: number | null;
  weekendPackageMinor?: number | null;
  depositMinor?: number | null;
  currency: string;
  stockQty: number;
  prepBufferDays?: number;
  cleanupBufferDays?: number;
  attributes?: Record<string, unknown> | null;
  isActive?: boolean;
  category?: { name: string; slug?: string } | null;
};

const tones: Array<DemoProduct["imageTone"]> = ["teal", "amber", "slate"];

export function mapApiProductToCard(product: ApiProduct, index = 0): DemoProduct {
  const attrs = product.attributes ?? {};
  const specs = Object.entries(attrs).map(([label, value]) => ({
    label,
    value: String(value),
  }));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? "Uncategorized",
    priceFrom: product.dailyPriceMinor,
    weekendPrice: product.weekendPriceMinor ?? undefined,
    weekendPackage: product.weekendPackageMinor ?? undefined,
    deposit: product.depositMinor ?? undefined,
    currency: product.currency,
    stock: product.stockQty,
    prepBufferDays: product.prepBufferDays ?? 0,
    cleanupBufferDays: product.cleanupBufferDays ?? 0,
    description: product.description ?? "",
    longDescription: product.description ?? "",
    specs,
    imageTone: tones[index % tones.length]!,
    galleryLabels: ["Hero", "Detail", "In use"],
  };
}
