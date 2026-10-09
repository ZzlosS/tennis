import { CourtSummary, PlayerSummary } from "./common";

// Hours kept free on a court, so nobody can book them.
export default interface BlockResponse {
  id: string;
  court: CourtSummary;
  // ISO 8601 in UTC, on the hour.
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: PlayerSummary;
}
