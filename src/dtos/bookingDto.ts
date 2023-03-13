import BookingType from "../enums/bookingType";

export default interface BookingDto {
  court: string;
  from: number;
  to: number;
  totalPrice: number;
  player: string;
  bookingType: BookingType;
}
