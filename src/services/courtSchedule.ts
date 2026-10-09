import { Club } from "../entities/club";
import { Court } from "../entities/court";
import { DEFAULT_OPENING_HOURS, DEFAULT_TIME_ZONE, OpeningHours } from "./time";

// The rules that decide when a court can be booked.
export interface CourtSchedule {
  timeZone: string;
  openingHours: OpeningHours;
  active: boolean;
  // Hours before the start after which a player can no longer cancel. Courts without a club have none.
  cancelCutoffHours: number;
  seasonEndsOn: string | null;
}

export const DEFAULT_CANCEL_CUTOFF_HOURS = 24;

function parseHours(text: string | undefined): OpeningHours | null {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as OpeningHours;
  } catch {
    return null;
  }
}

// A club court follows its club (zone, hours, cut-off) unless the court has hours of its own.
// A court without a club has its own zone and hours.
export function scheduleOf(court: Court, club: Club | null): CourtSchedule {
  return {
    timeZone: (club ? club.timeZone : court.timeZone) || DEFAULT_TIME_ZONE,
    openingHours: parseHours(court.openingHours) ?? parseHours(club?.openingHours) ?? DEFAULT_OPENING_HOURS,
    active: court.active !== false,
    cancelCutoffHours: club ? (club.cancelCutoffHours ?? DEFAULT_CANCEL_CUTOFF_HOURS) : 0,
    seasonEndsOn: club?.seasonEndsOn || null,
  };
}
