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
  // Leave out for a free court.
  pricePerHourMinor?: number;
}
