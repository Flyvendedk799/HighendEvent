export function formatMoney(
  amountMinor: number,
  currency = "DKK",
  locale = "da-DK",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
