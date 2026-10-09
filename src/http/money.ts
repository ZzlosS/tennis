export interface Money {
  // Whole minor units (para for RSD, cents for EUR), so there are no rounding errors.
  amountMinor: number;
  // ISO 4217 code, for example RSD.
  currency: string;
}

export const DEFAULT_CURRENCY = "RSD";

// Zero means free, and a free price is shown as null.
export const toMoney = (amountMinor: number | undefined, currency: string | undefined): Money | null =>
  amountMinor ? { amountMinor, currency: currency || DEFAULT_CURRENCY } : null;
