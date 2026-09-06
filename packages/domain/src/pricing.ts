import { eachDate, money, rentalDays, type DateInput, type Money } from "./types.js";

export type ProductPricingInput = {
  id: string;
  name: string;
  dailyPriceMinor: number;
  weekendPriceMinor?: number | null;
  weekendPackageMinor?: number | null;
  depositMinor?: number | null;
  currency: string;
  isActive: boolean;
};

export type PricingLineItem = {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  description?: string;
};

export type PricingBreakdown = {
  lineItems: PricingLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  taxPercentBps: number;
  depositMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  upfrontMinor: number;
  remainingMinor: number;
  currency: string;
};

export type BookingItemPricingInput = {
  product: ProductPricingInput;
  quantity: number;
  startDate: DateInput;
  endDate: DateInput;
};

export type TaxConfig = {
  taxPercentBps: number;
  inclusive: boolean;
};

export type PaymentModel = "FULL_UPFRONT" | "DEPOSIT_REMAINDER";

export function getEffectiveDailyPriceMinor(
  product: ProductPricingInput,
  startDate: DateInput,
  endDate: DateInput,
): number {
  const days = rentalDays(startDate, endDate);
  const dates = eachDate(startDate, endDate);

  if (product.weekendPackageMinor && days === 3) {
    const start = dates[0]!;
    const end = dates[2]!;
    if (start.getUTCDay() === 5 && end.getUTCDay() === 0) {
      return Math.round(product.weekendPackageMinor / 3);
    }
  }

  if (product.weekendPriceMinor != null) {
    let weekendDays = 0;
    let weekdayDays = 0;
    for (const d of dates) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) weekendDays += 1;
      else weekdayDays += 1;
    }
    if (weekendDays > 0 && weekdayDays === 0) return product.weekendPriceMinor;
    if (weekendDays > 0 && weekdayDays > 0) {
      return Math.round(
        (weekendDays * product.weekendPriceMinor + weekdayDays * product.dailyPriceMinor) /
          days,
      );
    }
  }

  return product.dailyPriceMinor;
}

export function calculateItemPricing(item: BookingItemPricingInput) {
  if (!item.product.isActive) throw new Error(`Product ${item.product.id} is inactive`);
  const days = rentalDays(item.startDate, item.endDate);
  const daily = getEffectiveDailyPriceMinor(item.product, item.startDate, item.endDate);
  const totalPriceMinor = daily * days * item.quantity;
  const depositMinor = (item.product.depositMinor ?? 0) * item.quantity;
  return {
    lineItems: [
      {
        name: item.product.name,
        quantity: item.quantity,
        unitPriceMinor: daily,
        totalPriceMinor,
        description: `${days} day(s) @ ${daily}/day`,
      } satisfies PricingLineItem,
    ],
    subtotalMinor: totalPriceMinor,
    depositMinor,
  };
}

export function calculateBookingPricing(params: {
  items: BookingItemPricingInput[];
  deliveryFeeMinor?: number;
  deliveryLabel?: string;
  discountMinor?: number;
  tax: TaxConfig;
  paymentModel: PaymentModel;
  currency: string;
}): PricingBreakdown {
  const lineItems: PricingLineItem[] = [];
  let subtotalMinor = 0;
  let depositMinor = 0;

  for (const item of params.items) {
    const priced = calculateItemPricing(item);
    lineItems.push(...priced.lineItems);
    subtotalMinor += priced.subtotalMinor;
    depositMinor += priced.depositMinor;
  }

  const deliveryFeeMinor = params.deliveryFeeMinor ?? 0;
  if (deliveryFeeMinor > 0) {
    lineItems.push({
      name: params.deliveryLabel ?? "Delivery",
      quantity: 1,
      unitPriceMinor: deliveryFeeMinor,
      totalPriceMinor: deliveryFeeMinor,
    });
  }

  const discountMinor = Math.min(params.discountMinor ?? 0, subtotalMinor + deliveryFeeMinor);
  const netBeforeTax = Math.max(0, subtotalMinor + deliveryFeeMinor - discountMinor);
  const taxMinor =
    !params.tax.inclusive && params.tax.taxPercentBps > 0
      ? Math.round((netBeforeTax * params.tax.taxPercentBps) / 10_000)
      : 0;
  const totalMinor = netBeforeTax + taxMinor + depositMinor;

  let upfrontMinor = totalMinor;
  let remainingMinor = 0;
  if (params.paymentModel === "DEPOSIT_REMAINDER") {
    upfrontMinor = depositMinor + deliveryFeeMinor;
    remainingMinor = Math.max(0, totalMinor - upfrontMinor);
  }

  return {
    lineItems,
    subtotalMinor,
    taxMinor,
    taxPercentBps: params.tax.taxPercentBps,
    depositMinor,
    deliveryFeeMinor,
    discountMinor,
    totalMinor,
    upfrontMinor,
    remainingMinor,
    currency: params.currency,
  };
}

export function asMoney(amountMinor: number, currency: string): Money {
  return money(amountMinor, currency);
}
