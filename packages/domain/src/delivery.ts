export type DeliveryFeeInput = {
  distanceKm: number;
  baseFeeMinor: number;
  perKmFeeMinor: number;
  freeDeliveryKm?: number;
  maxDeliveryKm?: number | null;
  currency: string;
};

export type DeliveryFeeResult = {
  feeMinor: number;
  allowed: boolean;
  distanceKm: number;
  chargeableKm: number;
  explanation: string;
};

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function calculateDeliveryFee(input: DeliveryFeeInput): DeliveryFeeResult {
  const freeDeliveryKm = input.freeDeliveryKm ?? 0;
  const distanceKm = Math.round(input.distanceKm * 10) / 10;

  if (input.maxDeliveryKm != null && distanceKm > input.maxDeliveryKm) {
    return {
      feeMinor: 0,
      allowed: false,
      distanceKm,
      chargeableKm: 0,
      explanation: `Delivery not available — ${distanceKm} km exceeds max ${input.maxDeliveryKm} km`,
    };
  }

  if (distanceKm <= freeDeliveryKm) {
    return {
      feeMinor: 0,
      allowed: true,
      distanceKm,
      chargeableKm: 0,
      explanation: `Free delivery within ${freeDeliveryKm} km`,
    };
  }

  const chargeableKm = Math.max(0, distanceKm - freeDeliveryKm);
  return {
    feeMinor: Math.round(input.baseFeeMinor + chargeableKm * input.perKmFeeMinor),
    allowed: true,
    distanceKm,
    chargeableKm,
    explanation: `Base ${input.baseFeeMinor} + ${chargeableKm.toFixed(1)} km × ${input.perKmFeeMinor}`,
  };
}
