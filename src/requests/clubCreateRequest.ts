import { OpeningHours } from "../responses/common";

export default interface ClubCreateRequest {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  // ISO 4217 code, for example RSD. Defaults to RSD.
  currency?: string;
  // IANA name. Defaults to Europe/Belgrade.
  timeZone?: string;
  // Seven days, Monday first, in the club's time zone. Defaults to 06:00 to 23:00 every day.
  openingHours?: OpeningHours;
  // Players cannot cancel closer to the start than this many hours. Defaults to 24.
  cancelCutoffHours?: number;
  // "YYYY-MM-DD": season bookings run weekly up to this day.
  seasonEndsOn?: string;
  // Where it is on the map. Give both or neither.
  latitude?: number;
  longitude?: number;
}
