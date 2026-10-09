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
  // ISO 8601 in UTC.
  playedAt: string;
  court: CourtSummary;
  club: ClubSummary | null;
}
