import CourtSurface from "../enums/courtSurface";
import ClubResponse from "./clubResponse";

export default interface CourtResponse {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  clubId: string;
  club?: ClubResponse;
  pricePerHour: number;
}
