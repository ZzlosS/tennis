import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config";
import Role from "../enums/role";
import { UnauthorizedError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import RedisClient from "./redisClient";

export interface AuthUser {
  id: string;
  role: Role;
}

interface AccessPayload {
  sub: string;
  role: Role;
}

const ALGORITHM = "HS256";
const refreshKey = (tokenId: string) => `refresh:${tokenId}`;
const REFRESH_TTL_SECONDS = () => config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

export function signAccessToken(user: AuthUser): { token: string; expiresIn: number } {
  const token = jwt.sign({ role: user.role }, config.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: user.id,
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
  const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
  return { token, expiresIn: exp - iat };
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: [ALGORITHM] }) as AccessPayload;
    if (!payload.sub) {
      throw new UnauthorizedError("Invalid token");
    }
    return { id: payload.sub, role: payload.role ?? Role.PLAYER };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expired", ErrorCode.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError("Invalid token");
  }
}

// Refresh tokens are random ids kept in Redis with a TTL, which gives logout and rotation for free.
export async function issueRefreshToken(playerId: string): Promise<string> {
  const tokenId = crypto.randomBytes(32).toString("base64url");
  await RedisClient.execute("SET", refreshKey(tokenId), playerId, "EX", REFRESH_TTL_SECONDS());
  return tokenId;
}

// Single use: the token is deleted as it is read, so a replayed token finds nothing.
export async function consumeRefreshToken(tokenId: string): Promise<string | null> {
  const playerId = await RedisClient.execute("GETDEL", refreshKey(tokenId));
  return typeof playerId === "string" ? playerId : null;
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await RedisClient.execute("DEL", refreshKey(tokenId));
}
