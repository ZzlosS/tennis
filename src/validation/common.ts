import { z } from "zod";
import { isIsoDate, isValidTimeZone } from "../services/time";

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

// An IANA time zone name, such as Europe/Belgrade.
export const timeZone = z
  .string()
  .refine(isValidTimeZone, { message: "Must be an IANA time zone such as Europe/Belgrade" });

const hourOfDay = z.string().regex(/^([01]\d|2[0-3]|24):00$/, "Must be a whole hour such as 08:00");

// Seven days, Monday first; null for a day that is closed.
export const openingHours = z
  .array(
    z
      .object({ open: hourOfDay, close: hourOfDay })
      .refine((day) => Number(day.open.slice(0, 2)) < Number(day.close.slice(0, 2)), {
        message: "Closing time must be after opening time",
      })
      .nullable()
  )
  .length(7, "Give seven days, Monday first");

// "YYYY-MM-DD", or an empty string to clear it.
export const dateOrEmpty = z.union([
  z.literal(""),
  z.string().refine(isIsoDate, { message: "Must be a date such as 2027-03-31" }),
]);
