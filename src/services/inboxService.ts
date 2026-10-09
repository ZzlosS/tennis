import crypto from "crypto";
import RedisClient from "./redisClient";
import { NotificationType } from "./pushTemplates";

// Every notification a player was sent, newest first, so the app can show them again. Only the last INBOX_SIZE are
// kept: the list is trimmed on every write. What the player has seen is one timestamp, not a flag per item.
export const INBOX_SIZE = 50;

const listKey = (playerId: string) => `inbox:${playerId}`;
const readKey = (playerId: string) => `inbox:${playerId}:readAt`;

export interface InboxItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  // ms
  createdAt: number;
}

export async function addToInbox(playerId: string, item: Omit<InboxItem, "id">): Promise<void> {
  const stored: InboxItem = { id: crypto.randomUUID(), ...item };
  await RedisClient.execute("LPUSH", listKey(playerId), JSON.stringify(stored));
  await RedisClient.execute("LTRIM", listKey(playerId), "0", String(INBOX_SIZE - 1));
}

export async function inboxOf(playerId: string): Promise<InboxItem[]> {
  const rows = (await RedisClient.execute("LRANGE", listKey(playerId), "0", "-1")) as string[];
  return rows.map((row) => JSON.parse(row) as InboxItem);
}

// When the player last opened the list, in ms; 0 when never.
export async function inboxReadAt(playerId: string): Promise<number> {
  const value = await RedisClient.execute("GET", readKey(playerId));
  return typeof value === "string" ? Number(value) : 0;
}

export async function markInboxRead(playerId: string, at: number): Promise<void> {
  await RedisClient.execute("SET", readKey(playerId), String(at));
}

export async function forgetInbox(playerId: string): Promise<void> {
  await RedisClient.execute("DEL", listKey(playerId), readKey(playerId));
}
