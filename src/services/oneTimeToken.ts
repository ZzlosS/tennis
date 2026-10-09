import crypto from "crypto";
import RedisClient from "./redisClient";

// Tokens that are emailed as links (password reset, email check). Redis keeps only a hash of the token, so reading
// the database does not give anyone a working link; each token works once and expires on its own.
export type TokenKind = "reset" | "verify";

const keyOf = (kind: TokenKind, token: string) => `${kind}:${crypto.createHash("sha256").update(token).digest("hex")}`;

export async function issueToken(kind: TokenKind, value: string, ttlSeconds: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await RedisClient.execute("SET", keyOf(kind, token), value, "EX", ttlSeconds);
  return token;
}

// Single use: the token is deleted as it is read. Returns what it was issued for, or null.
export async function consumeToken(kind: TokenKind, token: string): Promise<string | null> {
  const value = await RedisClient.execute("GETDEL", keyOf(kind, token));
  return typeof value === "string" ? value : null;
}

// At most one of something per player in a while (an email every minute): true when this one may go ahead.
export async function allowOnce(name: string, playerId: string, seconds: number): Promise<boolean> {
  return (await RedisClient.execute("SET", `cooldown:${name}:${playerId}`, "1", "NX", "EX", seconds)) === "OK";
}
