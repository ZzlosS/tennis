import PlayerLevel from "../enums/playerLevel";
import BaseEntity from "./baseEntity";

interface Player {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nickname: string;
  level: PlayerLevel;
  rackets: string[];
  address: string;
  city: string;
  country: string;
}

class Player extends BaseEntity {}
export { Player };
