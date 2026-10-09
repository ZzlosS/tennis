import RedisClient from "./redisClient";

// The phones a player is signed in on, as Expo push tokens. A token belongs to one player at a time:
// when someone else signs in on the same phone, the token moves to them.
const tokensKey = (playerId: string) => `devices:${playerId}`;
const ownerKey = (token: string) => `device:${token}`;

export async function registerDevice(playerId: string, token: string): Promise<void> {
  const previous = await RedisClient.execute("GET", ownerKey(token));
  if (typeof previous === "string" && previous !== playerId) {
    await RedisClient.execute("SREM", tokensKey(previous), token);
  }
  await RedisClient.execute("SET", ownerKey(token), playerId);
  await RedisClient.execute("SADD", tokensKey(playerId), token);
}

export async function unregisterDevice(playerId: string, token: string): Promise<void> {
  const owner = await RedisClient.execute("GET", ownerKey(token));
  if (owner === playerId) {
    await RedisClient.execute("DEL", ownerKey(token));
  }
  await RedisClient.execute("SREM", tokensKey(playerId), token);
}

export async function devicesOf(playerId: string): Promise<string[]> {
  return (await RedisClient.execute("SMEMBERS", tokensKey(playerId))) as string[];
}

export async function forgetDevicesOf(playerId: string): Promise<void> {
  for (const token of await devicesOf(playerId)) {
    await RedisClient.execute("DEL", ownerKey(token));
  }
  await RedisClient.execute("DEL", tokensKey(playerId));
}
