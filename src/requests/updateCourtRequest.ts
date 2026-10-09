import { OpeningHours } from "../responses/common";
import CourtSurface from "../enums/courtSurface";

export default interface UpdateCourtRequest {
  name?: string;
  surface?: CourtSurface;
  stands?: boolean;
  roof?: boolean;
  double?: boolean;
  pricePerHourMinor?: number;
  // The four below only apply to a court without a club; a club court takes its place and currency from the club.
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  // Only a court without a club has its own time zone.
  timeZone?: string;
  // A closed court cannot be booked; existing bookings stay.
  active?: boolean;
  // The court's own hours, Monday first.
  openingHours?: OpeningHours;
  // True removes the court's own hours, so a club court follows its club again.
  followClubHours?: boolean;
}
