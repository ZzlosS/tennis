import PlayerLevel from "../enums/playerLevel";

export default interface UpdatePlayerRequest {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  level?: PlayerLevel;
  // Language of emails and notifications: "en" or "sr".
  language?: "en" | "sr";
  address?: string;
  city?: string;
  country?: string;
}
