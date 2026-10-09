import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import { Money } from "../http/money";
import { ClubSummary } from "./common";

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
}
