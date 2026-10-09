import { z } from "zod";

export const id = z.string().trim().min(1).max(64);
export const text = (max = 200) => z.string().trim().min(1).max(max);
export const optionalText = (max = 200) => z.string().trim().max(max).default("");
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid ISO 8601 date" });
export const email = z.string().trim().toLowerCase().email().max(254);
// Whole hours of the day, 0 to 24.
export const hour = z.number().int().min(0).max(24);
export const price = z.number().min(0).max(1_000_000);
// ISO 8601 in UTC: it must end in Z, so a time never depends on the server's or the phone's zone.
export const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/, "Must be an ISO 8601 date and time in UTC, ending in Z")
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid date and time" });

// Bookings run on whole hours.
export const onTheHour = (value: string) => {
  const date = new Date(value);
  return date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
};

// ISO 4217: three capital letters.
export const currency = z.string().regex(/^[A-Z]{3}$/, "Must be a 3-letter currency code such as RSD");
// Whole minor units, never fractions.
export const minorUnits = z.number().int().min(0).max(100_000_000);
