import PlayerLevel from "../enums/playerLevel";

export default interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nickname?: string;
  level: PlayerLevel;
  address: string;
  city: string;
  country: string;
  // Language of the emails sent to the player: "en" (default) or "sr".
  language?: "en" | "sr";
}
