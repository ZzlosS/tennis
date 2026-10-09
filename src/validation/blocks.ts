import { z } from "zod";
import { isoDateTime, onTheHour } from "./common";

const hourlyTime = isoDateTime.refine(onTheHour, { message: "Must be on the hour, with no minutes or seconds" });
export const MAX_BLOCK_DAYS = 31;

export const createBlockBody = z
  .object({
    startsAt: hourlyTime,
    endsAt: hourlyTime,
    reason: z.string().trim().max(200).default(""),
  })
  .superRefine((block, context) => {
    const days = (Date.parse(block.endsAt) - Date.parse(block.startsAt)) / 86_400_000;
    if (days <= 0) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "'endsAt' must be after 'startsAt'" });
    } else if (days > MAX_BLOCK_DAYS) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: `A block can be at most ${MAX_BLOCK_DAYS} days` });
    }
  });
