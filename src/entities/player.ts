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
  // Language of emails and notifications: "en" or "sr".
  language: string;
  // First name, last name and nickname together, kept by the repository so players can be found by name.
  searchName?: string;
};

export { Player };
