import { SetScore } from "../responses/matchResponse";

export default interface UpdateMatchRequest {
  firstTeam?: string[];
  secondTeam?: string[];
  sets?: SetScore[];
  courtId?: string;
  playedAt?: string;
}
