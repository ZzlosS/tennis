import { OpeningHours } from "./common";
import CourtResponse from "./courtResponse";

export default interface ClubResponse {
  id: string;
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  // ISO 4217 code that the club's prices are in.
  currency: string;
  courtCount: number;
  // IANA name; opening hours and cancel cut-off are in this zone.
  timeZone: string;
  openingHours: OpeningHours;
  // Players cannot cancel a booking closer to its start than this many hours.
  cancelCutoffHours: number;
  // "YYYY-MM-DD". Season bookings repeat weekly up to this day; null when not set.
  seasonEndsOn: string | null;
  // Where the club is on the map; null when not set.
  latitude: number | null;
  longitude: number | null;
}

export interface ClubDetailResponse extends ClubResponse {
  courts: CourtResponse[];
}
