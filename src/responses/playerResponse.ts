import PlayerLevel from "../enums/playerLevel";

export default interface PlayerResponse {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  level: PlayerLevel;
  address: string;
  // Only shown to the player themselves and to admins.
  email?: string;
  city: string;
  country: string;
}
