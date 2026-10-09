import { z } from "zod";
import { id } from "./common";

const playersNeeded = z.number().int().min(1).max(3);

export const createPartnerRequestBody = z.object({
  bookingId: id,
  playersNeeded,
});

export const updatePartnerRequestBody = z.object({
  bookingId: id.optional(),
  playersNeeded: playersNeeded.optional(),
});
