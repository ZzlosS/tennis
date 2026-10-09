import BookingType from "../enums/bookingType";
import { Money } from "../http/money";
import { ClubSummary, CourtSummary, PlayerSummary } from "./common";

export default interface BookingResponse {
  id: string;
  // ISO 8601 in UTC, on the hour.
  startsAt: string;
  endsAt: string;
  court: CourtSummary;
  // Null when the court has no club.
  club: ClubSummary | null;
  player: PlayerSummary;
  // Null when the court is free.
  totalPrice: Money | null;
  bookingType: BookingType;
}
