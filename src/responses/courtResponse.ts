import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import { Money } from "../http/money";
import { ClubSummary, OpeningHours } from "./common";

export default interface CourtResponse {
  id: string;
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  kind: CourtKind;
  // Null for a public or private court.
  club: ClubSummary | null;
  // The player who added a public or private court. Null for a club court.
  ownerId: string | null;
  address: string;
  city: string;
  country: string;
  // Null means free.
  pricePerHour: Money | null;
  // False when the court is closed and cannot be booked.
  active: boolean;
  timeZone: string;
  // The hours that apply: the court's own, else its club's, else 06:00 to 23:00.
  openingHours: OpeningHours;
  // Where the court is on the map. A club court is where its club is. Null when not set.
  latitude: number | null;
  longitude: number | null;
}
