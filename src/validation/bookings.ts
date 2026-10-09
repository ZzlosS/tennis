import { z } from "zod";
import BookingType from "../enums/bookingType";
import { id, isoDateTime, onTheHour } from "./common";

const MAX_HOURS = 24;

const hourlyTime = isoDateTime.refine(onTheHour, { message: "Must be on the hour, with no minutes or seconds" });

// Both times must be on the hour, the end after the start, and the booking at most a day long.
export const checkBookingTimes = (booking: { startsAt?: string; endsAt?: string }, context: z.RefinementCtx) => {
  if (!booking.startsAt || !booking.endsAt) {
    return;
  }
  const hours = (Date.parse(booking.endsAt) - Date.parse(booking.startsAt)) / 3_600_000;
  if (hours <= 0) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "'endsAt' must be after 'startsAt'" });
  } else if (hours > MAX_HOURS) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: `A booking can be at most ${MAX_HOURS} hours` });
  }
};

export const createBookingBody = z
  .object({
    courtId: id,
    startsAt: hourlyTime,
    endsAt: hourlyTime,
    bookingType: z.nativeEnum(BookingType),
    partnerRequest: z.object({ playersNeeded: z.number().int().min(1).max(3) }).optional(),
  })
  .superRefine(checkBookingTimes);

export const updateBookingBody = z
  .object({
    courtId: id.optional(),
    startsAt: hourlyTime.optional(),
    endsAt: hourlyTime.optional(),
  })
  .superRefine(checkBookingTimes);
