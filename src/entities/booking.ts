import BookingType from "../enums/bookingType";
import BaseEntity from "./baseEntity";

interface Bookings extends CreationDeletionInfo {
  court: string;
  from: number;
  to: number;
  totalPrice: number;
  player: string;
  bookingType: BookingType;
}

class Bookings extends BaseEntity {}
export { Bookings };