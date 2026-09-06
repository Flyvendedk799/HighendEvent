/** Storefront product shape used by detail + availability calendar. */

export type StoreProduct = {
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

export type StoreOccupancy = {
  id: string;
  bookingNo: string;
  productId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  statusKey: string;
};

export type StoreBlackout = {
  productId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export function productAvailabilityInput(product: StoreProduct) {
  return {
    id: product.id,
    stockQty: product.stock,
    prepBufferDays: product.prepBufferDays,
    cleanupBufferDays: product.cleanupBufferDays,
    isActive: true,
  };
}

export function productPricingInput(product: StoreProduct) {
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
