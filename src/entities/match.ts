import BaseEntity from "./baseEntity";

interface Match {
  firstTeam: string[];
  secondTeam: string[];
  result: string[];
  court: string;
  date: Date;
}

class Match extends BaseEntity {}
export { Match };
