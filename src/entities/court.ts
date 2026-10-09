import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import BaseEntity from "./baseEntity";

type Court = BaseEntity & {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  kind: CourtKind;
  // The club's id, or COURT_NO_CLUB for a public or private court.
  club: string;
  // The player who added a public or private court, or "" for a club court.
  ownerId: string;
  address: string;
  city: string;
  country: string;
  // Only used by courts without a club; a club's courts are priced in the club's currency.
  currency: string;
  pricePerHourMinor: number;
  // A closed court cannot be booked. Courts saved before this field existed count as open.
  active: boolean;
  // Courts without a club have their own time zone; a club court uses its club's.
  timeZone: string;
  // JSON text of OpeningHours. Empty means the club's (or the default) apply.
  openingHours: string;
  // "latitude,longitude" for the map. Only courts without a club have their own; empty when not set.
  location: string;
};

export { Court };
