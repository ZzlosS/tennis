import HandoverStatus from "../enums/handoverStatus";
import { ClubSummary, CourtSummary, PlayerSummary } from "./common";

// A request to a club to take over a court that has no club.
export default interface HandoverResponse {
  id: string;
  court: CourtSummary;
  // The club asked to take the court over; its admins answer.
  club: ClubSummary;
  // The court's owner (or the ADMIN) who asked.
  requestedBy: PlayerSummary;
  status: HandoverStatus;
  // ISO 8601 in UTC.
  createdAt: string;
  // When it was accepted, declined or cancelled; null while pending.
  decidedAt: string | null;
}
