import PlayerLevel from "../enums/playerLevel";

export default interface UpdatePlayerRequest {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  level?: PlayerLevel;
  address?: string;
  city?: string;
  country?: string;
}
