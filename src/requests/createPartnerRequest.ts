import PlayerLevel from "../enums/playerLevel";

// The creator is the logged-in user, who must own the booking.
export default interface CreatePartnerRequest {
  bookingId: string;
  // 1 to 3 more players: 1 for singles, 3 for doubles.
  playersNeeded: number;
  // Only players of this level are wanted. Leave out for any level.
  level?: PlayerLevel;
}
