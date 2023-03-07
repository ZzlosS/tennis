import PlayerLevel from "../enums/playerLevel";

export default interface PlayerDto { 
  firstName: string;
  lastName: string;
  email: string;
  nickname: string;
  level: PlayerLevel;
  address: string;
  city: string;
  country: string;
}