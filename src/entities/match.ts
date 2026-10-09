import BaseEntity from "./baseEntity";

type Match = BaseEntity & {
  firstTeam: string[];
  secondTeam: string[];
  // JSON text of [{ firstTeam, secondTeam }, ...], one entry per set.
  sets: string;
  court: string;
  playedAt: Date;
};

export { Match };
