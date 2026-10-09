import { z } from "zod";
import PlayerLevel from "../enums/playerLevel";
import { id } from "./common";

const playersNeeded = z.number().int().min(1).max(3);

export const createPartnerRequestBody = z.object({
  bookingId: id,
  playersNeeded,
  level: z.nativeEnum(PlayerLevel).optional(),
});

export const updatePartnerRequestBody = z.object({
  bookingId: id.optional(),
  playersNeeded: playersNeeded.optional(),
  level: z.nativeEnum(PlayerLevel).optional(),
});
