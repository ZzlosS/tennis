import { z } from "zod";
import CourtSurface from "../enums/courtSurface";
import { id, price, text } from "./common";

export const createClubBody = z.object({
  name: text(100),
  address: text(),
  description: z.string().trim().max(2000).default(""),
  city: text(100),
  country: text(100),
});

export const updateClubBody = createClubBody.partial();

export const createCourtBody = z.object({
  name: text(100),
  surface: z.nativeEnum(CourtSurface),
  stands: z.boolean().default(false),
  roof: z.boolean().default(false),
  double: z.boolean().default(false),
  pricePerHour: price,
  clubId: id.optional(),
});

export const updateCourtBody = createCourtBody.omit({ clubId: true }).partial();

export const assignCourtBody = z.object({
  courtEntityID: id,
  clubEntityID: id,
});

export const courtPriceQuery = z.object({
  from: z.coerce.number().min(0),
  to: z.coerce.number().min(0),
});
