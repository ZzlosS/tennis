import BookingStatus from "../enums/bookingStatus";
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
  status: BookingStatus;
  // Shared by the bookings made together by a weekly repeat. Empty for a single booking.
  seriesId: string;
  // When a club admin marked it as paid at the club, in ms. 0 when not marked.
  paidAt: number;
  cancelledAt: number;
  // The player who cancelled it.
  cancelledBy: string;
};

export { Booking };
