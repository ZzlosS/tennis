import MatchStatus from "../enums/matchStatus";
import BaseEntity from "./baseEntity";

type Match = BaseEntity & {
  firstTeam: string[];
  secondTeam: string[];
  // JSON text of [{ firstTeam, secondTeam }, ...], one entry per set.
  sets: string;
  court: string;
  playedAt: Date;
  status: MatchStatus;
  // The player who entered or last changed the score. The other team confirms it.
  createdBy: string;
};

export { Match };
