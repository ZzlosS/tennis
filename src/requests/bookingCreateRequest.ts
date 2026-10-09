import BookingType from "../enums/bookingType";

// The player is the logged-in user and the price comes from the court, so neither is sent.
export default interface BookingCreateRequest {
  courtId: string;
  // ISO 8601 in UTC, on the hour, for example 2026-10-10T16:00:00Z.
  startsAt: string;
  endsAt: string;
  bookingType: BookingType;
}
