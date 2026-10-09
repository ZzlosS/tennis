import { z } from "zod";
import BookingType from "../enums/bookingType";
import { hour, id, isoDate } from "./common";

export const createBookingBody = z
  .object({
    court: id,
    from: hour,
    to: hour,
    bookingType: z.nativeEnum(BookingType),
    date: isoDate,
  })
  .refine((booking) => booking.from < booking.to, { message: "'to' must be after 'from'", path: ["to"] });

export const updateBookingBody = z.object({
  court: id.optional(),
  from: hour.optional(),
  to: hour.optional(),
  date: isoDate.optional(),
});
