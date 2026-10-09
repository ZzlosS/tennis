import { z } from "zod";
import CourtSurface from "../enums/courtSurface";
import {
  bothCoordinates,
  bothCoordinatesMessage,
  currency,
  dateOrEmpty,
  id,
  latitude,
  longitude,
  minorUnits,
  openingHours,
  text,
  timeZone,
} from "./common";

const clubFields = z.object({
  name: text(100),
  address: text(),
  description: z.string().trim().max(2000).default(""),
  city: text(100),
  country: text(100),
  currency: currency.optional(),
  timeZone: timeZone.optional(),
  openingHours: openingHours.optional(),
  cancelCutoffHours: z.number().int().min(0).max(168).optional(),
  seasonEndsOn: dateOrEmpty.optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
});

export const createClubBody = clubFields.refine(bothCoordinates, bothCoordinatesMessage);

export const updateClubBody = clubFields.partial().refine(bothCoordinates, bothCoordinatesMessage);

const courtFields = {
  name: text(100),
  surface: z.nativeEnum(CourtSurface),
  stands: z.boolean().default(false),
  roof: z.boolean().default(false),
  double: z.boolean().default(false),
  pricePerHourMinor: minorUnits.optional(),
};

export const createCourtBody = z.object(courtFields);

export const createStandaloneCourtBody = z
  .object({
    ...courtFields,
    kind: z.enum(["PUBLIC", "PRIVATE"]),
    address: text(),
    city: text(100),
    country: text(100),
    currency: currency.optional(),
    timeZone: timeZone.optional(),
    openingHours: openingHours.optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
  })
  .refine(bothCoordinates, bothCoordinatesMessage);

export const updateCourtBody = z
  .object({
    name: courtFields.name.optional(),
    surface: courtFields.surface.optional(),
    stands: z.boolean().optional(),
    roof: z.boolean().optional(),
    double: z.boolean().optional(),
    pricePerHourMinor: courtFields.pricePerHourMinor,
    address: text().optional(),
    city: text(100).optional(),
    country: text(100).optional(),
    currency: currency.optional(),
    active: z.boolean().optional(),
    timeZone: timeZone.optional(),
    openingHours: openingHours.optional(),
    followClubHours: z.boolean().optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
  })
  .refine(bothCoordinates, bothCoordinatesMessage);

export const assignCourtBody = z.object({
  clubId: id,
});
