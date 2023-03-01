import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";

interface Match extends CreationDeletionInfo {
  firstTeam: string[];
  secondTeam: string[];
  result: string[];
  court: string;
  date: Date;
}

class Match extends BaseEntity {}
export { Match };
