import BookingType from "../enums/bookingType";
import BaseEntity from "./baseEntity";

type Booking = BaseEntity & {
  court: string;
  startsAt: Date;
  endsAt: Date;
  // Hours times the court's hourly price, worked out by the server when the booking is made.
  totalPriceMinor: number;
  currency: string;
  player: string;
  bookingType: BookingType;
};

export { Booking };
