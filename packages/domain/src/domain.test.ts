import { describe, expect, it } from "vitest";
import { availableQuantity, getAvailabilityCalendar, isAvailable } from "./availability.js";
import { calculateDeliveryFee, haversineKm } from "./delivery.js";
import { calculateBookingPricing, getEffectiveDailyPriceMinor } from "./pricing.js";
import { assertTransition, canTransition } from "./booking-status.js";
import { rentalDays } from "./types.js";

const product = {
  id: "p1",
  stockQty: 2,
  prepBufferDays: 1,
  cleanupBufferDays: 1,
  isActive: true,
};

describe("availability (legacy parity)", () => {
  it("returns stock when nothing is booked", () => {
    expect(
      availableQuantity({
        product,
        startDate: "2026-06-10",
        endDate: "2026-06-12",
        bookings: [],
        blackouts: [],
      }),
    ).toBe(2);
  });

  it("accounts for prep/cleanup buffers overlapping bookings", () => {
    // Request June 11 expands to June 10–12; existing booking on June 10 conflicts.
    const qty = availableQuantity({
      product,
      startDate: "2026-06-11",
      endDate: "2026-06-11",
      bookings: [
        {
          id: "b1",
          bookingNo: "RNT-1",
          productId: "p1",
          quantity: 2,
          startDate: "2026-06-10",
          endDate: "2026-06-10",
          statusKey: "fully_paid",
        },
      ],
      blackouts: [],
    });
    expect(qty).toBe(0);
  });

  it("returns 0 on blackout overlap", () => {
    expect(
      availableQuantity({
        product,
        startDate: "2026-06-10",
        endDate: "2026-06-12",
        bookings: [],
        blackouts: [{ productId: "p1", startDate: "2026-06-11", endDate: "2026-06-11" }],
      }),
    ).toBe(0);
  });

  it("ignores cancelled bookings", () => {
    expect(
      isAvailable({
        product,
        startDate: "2026-06-10",
        endDate: "2026-06-12",
        quantity: 2,
        bookings: [
          {
            id: "b1",
            bookingNo: "X",
            productId: "p1",
            quantity: 2,
            startDate: "2026-06-10",
            endDate: "2026-06-12",
            statusKey: "cancelled",
          },
        ],
        blackouts: [],
      }),
    ).toBe(true);
  });

  it("builds a calendar", () => {
    const cal = getAvailabilityCalendar({
      product,
      startDate: "2026-06-10",
      endDate: "2026-06-11",
      bookings: [],
      blackouts: [],
    });
    expect(cal).toHaveLength(2);
    expect(cal[0]?.isAvailable).toBe(true);
  });
});

describe("pricing (legacy parity)", () => {
  const pricedProduct = {
    id: "p1",
    name: "Popcorn",
    dailyPriceMinor: 50000,
    weekendPriceMinor: 60000,
    weekendPackageMinor: 120000,
    depositMinor: 100000,
    currency: "DKK",
    isActive: true,
  };

  it("counts inclusive rental days", () => {
    expect(rentalDays("2026-06-10", "2026-06-12")).toBe(3);
  });

  it("applies Fri–Sun weekend package averaged per day", () => {
    expect(getEffectiveDailyPriceMinor(pricedProduct, "2026-06-12", "2026-06-14")).toBe(40000);
  });

  it("uses weekend price for Sat–Sun only", () => {
    expect(getEffectiveDailyPriceMinor(pricedProduct, "2026-06-13", "2026-06-14")).toBe(60000);
  });

  it("weights mixed weekday/weekend days", () => {
    expect(getEffectiveDailyPriceMinor(pricedProduct, "2026-06-12", "2026-06-13")).toBe(
      Math.round((50000 + 60000) / 2),
    );
  });

  it("calculates full booking with tax exclusive and deposit", () => {
    const result = calculateBookingPricing({
      items: [
        {
          product: pricedProduct,
          quantity: 1,
          startDate: "2026-06-10",
          endDate: "2026-06-10",
        },
      ],
      deliveryFeeMinor: 15000,
      tax: { taxPercentBps: 2500, inclusive: false },
      paymentModel: "FULL_UPFRONT",
      currency: "DKK",
    });
    expect(result.subtotalMinor).toBe(50000);
    expect(result.deliveryFeeMinor).toBe(15000);
    expect(result.taxMinor).toBe(16250);
    expect(result.depositMinor).toBe(100000);
    expect(result.totalMinor).toBe(50000 + 15000 + 16250 + 100000);
  });
});

describe("delivery fee", () => {
  it("computes haversine roughly Copenhagen–Aarhus", () => {
    const km = haversineKm(55.6761, 12.5683, 56.1629, 10.2039);
    expect(km).toBeGreaterThan(140);
    expect(km).toBeLessThan(200);
  });

  it("applies free radius then per-km", () => {
    const fee = calculateDeliveryFee({
      distanceKm: 25,
      baseFeeMinor: 20000,
      perKmFeeMinor: 500,
      freeDeliveryKm: 10,
      maxDeliveryKm: 100,
      currency: "DKK",
    });
    expect(fee.allowed).toBe(true);
    expect(fee.chargeableKm).toBe(15);
    expect(fee.feeMinor).toBe(20000 + 15 * 500);
  });

  it("rejects over max distance", () => {
    expect(
      calculateDeliveryFee({
        distanceKm: 120,
        baseFeeMinor: 20000,
        perKmFeeMinor: 500,
        freeDeliveryKm: 10,
        maxDeliveryKm: 100,
        currency: "DKK",
      }).allowed,
    ).toBe(false);
  });
});

describe("booking status machine", () => {
  it("allows pending → fully_paid", () => {
    expect(canTransition("pending", "fully_paid")).toBe(true);
  });

  it("blocks deposit_refunded → anything", () => {
    expect(canTransition("deposit_refunded", "pending")).toBe(false);
  });

  it("throws on invalid transition", () => {
    expect(() => assertTransition("pending", "returned_good")).toThrow();
  });
});
