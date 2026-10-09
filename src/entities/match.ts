import BaseEntity from "./baseEntity";

type Match = BaseEntity & {
  firstTeam: string[];
  secondTeam: string[];
  result: string[];
  court: string;
  date: Date;
};

export { Match };
