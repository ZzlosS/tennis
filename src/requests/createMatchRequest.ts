import { SetScore } from "../responses/matchResponse";

export default interface CreateMatchRequest {
  // Player ids, one or two per team.
  firstTeam: string[];
  secondTeam: string[];
  sets: SetScore[];
  courtId: string;
  // ISO 8601 in UTC.
  playedAt: string;
}
