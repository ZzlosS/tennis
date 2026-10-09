import PlayerLevel from "../enums/playerLevel";
import Role from "../enums/role";
import BaseEntity from "./baseEntity";

type Player = BaseEntity & {
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
  // When the player confirmed their email through the emailed link, in ms. 0 when not confirmed.
  emailVerifiedAt: number;
};

export { Player };
