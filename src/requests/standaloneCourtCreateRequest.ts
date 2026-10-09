import { OpeningHours } from "../responses/common";
import CourtSurface from "../enums/courtSurface";

// A public or private court that has no club. The logged-in player becomes its owner.
export default interface StandaloneCourtCreateRequest {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  kind: "PUBLIC" | "PRIVATE";
  address: string;
  city: string;
  country: string;
  // ISO 4217 code. Defaults to RSD.
  currency?: string;
  // IANA name. Defaults to Europe/Belgrade.
  timeZone?: string;
  // Seven days, Monday first. Defaults to 06:00 to 23:00 every day.
  openingHours?: OpeningHours;
  // Leave out for a free court.
  pricePerHourMinor?: number;
  // Where it is on the map. Give both or neither.
  latitude?: number;
  longitude?: number;
}
