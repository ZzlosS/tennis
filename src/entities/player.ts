import PlayerLevel from "../enums/playerLevel";
import Role from "../enums/role";
import BaseEntity from "./baseEntity";

interface Player {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  nickname: string;
  level: PlayerLevel;
  rackets: string[];
  address: string;
  city: string;
  country: string;
}

class Player extends BaseEntity {}
export { Player };
