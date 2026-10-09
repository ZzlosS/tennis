import { z } from "zod";
import { id, isoDate } from "./common";

export const createMatchBody = z.object({
  // Comma-separated player ids, as the API already expects.
  firstTeam: z.string().trim().min(1).max(500),
  secondTeam: z.string().trim().min(1).max(500),
  result: z.string().trim().min(1).max(200),
  court: id,
  date: isoDate,
});

export const updateMatchBody = z.object({
  firstTeam: z.array(id).max(4).optional(),
  secondTeam: z.array(id).max(4).optional(),
  result: z.array(z.string().max(20)).max(10).optional(),
  court: id.optional(),
  date: isoDate.optional(),
});
