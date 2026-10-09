import CourtSurface from "../enums/courtSurface";

// A court inside a club. It is priced in the club's currency; leave the price out for a free court.
export default interface CourtCreateRequest {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  pricePerHourMinor?: number;
}
