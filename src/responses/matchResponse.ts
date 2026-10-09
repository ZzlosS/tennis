import MatchStatus from "../enums/matchStatus";
import { ClubSummary, CourtSummary, PlayerSummary } from "./common";

export interface SetScore {
  firstTeam: number;
  secondTeam: number;
}

export default interface MatchResponse {
  id: string;
  firstTeam: PlayerSummary[];
  secondTeam: PlayerSummary[];
  sets: SetScore[];
  // PENDING until a player of the other team confirms the score; only CONFIRMED matches count for the stats.
  status: MatchStatus;
  // Who entered or last changed the score. The players of the other team can confirm or dispute it.
  createdBy: PlayerSummary;
  // ISO 8601 in UTC.
  playedAt: string;
  court: CourtSummary;
  club: ClubSummary | null;
}
