import CourtSurface from "../enums/courtSurface";

export default interface CourtDto {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  pricePerHour: number;
}