import BookingType from "../enums/bookingType";

// The player is the logged-in user and the price comes from the court, so neither is sent.
export default interface BookingCreateRequest {
  court: string;
  from: number;
  to: number;
  bookingType: BookingType;
  date: string;
}
