import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";
import { Court } from "./courts";
import { Player } from "./player";

interface Match extends CreationDeletionInfo {
  firstTeam: string[];
  secondTeam: string[];
  result: [number, number];
  court: string;
  date: Date;
}

class Match extends BaseEntity {}
export { Match };
