import BookingType from "../enums/bookingType";
import BaseEntity from "./baseEntity";

interface Booking {
  court: string;
  from: number;
  to: number;
  totalPrice: number;
  player: string;
  bookingType: BookingType;
}

class Booking extends BaseEntity {}
export { Booking };