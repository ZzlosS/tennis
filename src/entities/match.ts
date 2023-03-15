import BaseEntity from "./baseEntity";

interface Match {
  firstTeam: string[];
  secondTeam: string[];
  result: string[];
  court: string;
}

class Match extends BaseEntity {}
export { Match };
