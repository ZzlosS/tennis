import BookingStatus from "../enums/bookingStatus";
import BookingType from "../enums/bookingType";
import RequestStatus from "../enums/requestStatus";
import { Money } from "../http/money";
import { ClubSummary, CourtSummary, PlayerSummary } from "./common";

// The partner request made for a booking, in short: enough to show whether partners were found.
export interface BookingPartnerInfo {
  id: string;
  playersNeeded: number;
  // Places still open.
  spotsLeft: number;
  status: RequestStatus;
}

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
  status: BookingStatus;
  // Bookings made together by a weekly repeat share it. Null for a single booking.
  seriesId: string | null;
  // When a club admin marked it as paid at the club. Null when not marked.
  paidAt: string | null;
  // The request looking for partners for this booking. Null when there is none.
  partnerRequest: BookingPartnerInfo | null;
}
