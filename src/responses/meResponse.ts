import Role from "../enums/role";
import PlayerResponse from "./playerResponse";

// The logged-in player: a player's own view, with the email and the role.
export default interface MeResponse extends PlayerResponse {
  email: string;
  role: Role;
  // True once the player has confirmed the email address through the emailed link.
  emailVerified: boolean;
}
