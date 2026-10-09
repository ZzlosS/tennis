import { AvailabilitySlot } from "./availabilityResponse";
import { CourtSummary, PlayerSummary } from "./common";

export interface ScheduleBooking {
  id: string;
  player: PlayerSummary;
  // When it was marked as paid at the club. Null when not marked.
  paidAt: string | null;
  // Set when the booking is one of a weekly repeat.
  seriesId: string | null;
}

export interface ScheduleBlock {
  id: string;
  reason: string;
}

export interface ScheduleSlot extends AvailabilitySlot {
  // Who holds a BOOKED hour; null otherwise.
  booking: ScheduleBooking | null;
  // What holds a BLOCKED hour; null otherwise.
  block: ScheduleBlock | null;
}

export interface ScheduleCourt {
  court: CourtSummary;
  // False for a closed court, whose hours all show as CLOSED.
  active: boolean;
  slots: ScheduleSlot[];
}

// One day of a club, hour by hour on every court, for the club's admins.
export default interface ClubScheduleResponse {
  clubId: string;
  // The local day asked for, "YYYY-MM-DD".
  date: string;
  timeZone: string;
  courts: ScheduleCourt[];
}
