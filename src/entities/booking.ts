import BookingType from "../enums/bookingType";
import BaseEntity from "./baseEntity";

type Booking = BaseEntity & {
  court: string;
  from: number;
  to: number;
  totalPrice: number;
  player: string;
  bookingType: BookingType;
  date: Date;
};

export { Booking };
