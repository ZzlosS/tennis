import PlayerLevel from "../enums/playerLevel";
import Role from "../enums/role";

export interface AuthPlayerResponse {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  level: PlayerLevel;
  role: Role;
  address: string;
  city: string;
  country: string;
}

export default interface AuthResponse {
  accessToken: string;
  // Seconds until the access token expires.
  expiresIn: number;
  refreshToken: string;
  player: AuthPlayerResponse;
}
