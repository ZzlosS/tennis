import CourtSurface from "../enums/courtSurface";

export default interface CourtCreateRequest {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  pricePerHour: number;
  // Club admins must name their club. Without it an ADMIN creates an unassigned court.
  clubId?: string;
}
