import PlayerLevel from "../enums/playerLevel";
import BookingType from "../enums/bookingType";

// The player is the logged-in user and the price comes from the court, so neither is sent.
export default interface BookingCreateRequest {
  courtId: string;
  // ISO 8601 in UTC, on the hour, for example 2026-10-10T16:00:00Z.
  startsAt: string;
  endsAt: string;
  bookingType: BookingType;
  // Also ask for partners for this booking (the first one, when it repeats).
  partnerRequest?: BookingPartnerRequest;
}

export interface BookingPartnerRequest {
  // 1 to 3 more players.
  playersNeeded: number;
  // Only players of this level are wanted. Leave out for any level.
  level?: PlayerLevel;
}
