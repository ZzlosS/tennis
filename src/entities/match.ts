import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";
import { Court } from "./courts";
import { Player } from "./player";

interface Match extends CreationDeletionInfo {
  firstTeam: Player[];
  secondTeam: Player[];
  result: [number, number];
  court: Court;
  date: Date;
}

class Match extends BaseEntity {}
export { Match };
