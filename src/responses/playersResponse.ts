import PlayerLevel from "../enums/playerLevel";

export default interface PlayersResponse {
  entityId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  level: PlayerLevel;
  address: string;
  email?: string;
  city: string;
  country: string;
}
