import { Player } from "../entities/player";
import Role from "../enums/role";
import AuthResponse from "../responses/authResponse";
import { issueRefreshToken, signAccessToken } from "./tokenService";

// A new access token and refresh token for a player, in the shape the sign-in routes answer with.
export async function issueSession(player: Player): Promise<AuthResponse> {
  const role = player.role ?? Role.PLAYER;
  const { token, expiresIn } = signAccessToken({ id: player.entityId, role });

  return {
    accessToken: token,
    expiresIn,
    refreshToken: await issueRefreshToken(player.entityId),
    player: {
      id: player.entityId,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname,
      email: player.email,
      level: player.level,
      role,
      address: player.address,
      city: player.city,
      country: player.country,
    },
  };
}
