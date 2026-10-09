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
}
