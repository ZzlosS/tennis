import PlayerLevel from "../enums/playerLevel";
import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";
import { Racket } from "./racket";

interface Player extends CreationDeletionInfo {
  firstName: string;
  lastName: string;
  email: string;
  nickname: string;
  level: PlayerLevel;
  rackets: string[]; 
  address: string;
  city: string;
  country: string;
}

class Player extends BaseEntity {}
export { Player };
