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
