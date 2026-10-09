import { z } from "zod";
import { id } from "./common";

const playersNeeded = z.number().int().min(1).max(3);

export const createRequestBody = z.object({
  bookingEntityID: id,
  numberOfPlayersNeeded: playersNeeded,
});

export const acceptRequestBody = z.object({
  requestEntityID: id,
});

export const updateRequestBody = z.object({
  bookingEntityID: id.optional(),
  numberOfPlayersNeeded: playersNeeded.optional(),
});
