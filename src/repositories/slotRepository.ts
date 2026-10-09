import { claimSlots, runScript } from "../redis/scripts";
import RedisClient from "../services/redisClient";
import { DAY_MS } from "../services/time";

// Which hours of which courts are taken. Each court has one hash per UTC day: the field is the hour ("00" to "23")
// and the value says who holds it. This is the only code that touches these keys, so the double-booking rule
// lives in one place.

export type HolderKind = "b" | "x";

export interface SlotRef {
  courtId: string;
  hour: Date;
  // See makeHolder.
  holder: string;
}

// "b:<bookingId>" for a booking, "x:<blockId>" for a block put there by a club admin.
export const makeHolder = (kind: HolderKind, id: string) => `${kind}:${id}`;

export interface ParsedHolder {
  kind: HolderKind;
  id: string;
}

export function parseHolder(holder: string): ParsedHolder {
  const [kind, id] = holder.split(":");
  return { kind: kind as HolderKind, id };
}

const dayKey = (courtId: string, hour: Date) => `slots:{${courtId}}:${hour.toISOString().slice(0, 10)}`;
const hourField = (hour: Date) => String(hour.getUTCHours()).padStart(2, "0");
// Day hashes are kept a week after their day, then Redis removes them.
const expiresAt = (key: string) => Math.floor((Date.parse(key.slice(-10)) + DAY_MS + 7 * DAY_MS) / 1000);

function parseKey(key: string, field: string): { courtId: string; hour: Date } {
  const match = /^slots:\{(.+)\}:(\d{4}-\d{2}-\d{2})$/.exec(key)!;
  return { courtId: match[1], hour: new Date(`${match[2]}T${field}:00:00.000Z`) };
}

// Taken hours reported by a failed claim.
export interface TakenSlot extends SlotRef {}

export type ClaimResult = { ok: true } | { ok: false; taken: TakenSlot[] };

export default class SlotRepository {
  private async attempt(claims: SlotRef[], releases: SlotRef[]): Promise<TakenSlot[]> {
    const keys = [...new Set([...claims, ...releases].map((slot) => dayKey(slot.courtId, slot.hour)))];
    const triple = (slot: SlotRef) => [
      keys.indexOf(dayKey(slot.courtId, slot.hour)) + 1,
      hourField(slot.hour),
      slot.holder,
    ];
    const reply = (await runScript(claimSlots, keys, [
      claims.length,
      releases.length,
      ...claims.flatMap(triple),
      ...releases.flatMap(triple),
      ...keys.map(expiresAt),
    ])) as string[];

    return reply.map((entry) => {
      const [key, field, ...holder] = entry.split("|");
      return { ...parseKey(key, field), holder: holder.join("|") };
    });
  }

  async release(releases: SlotRef[]): Promise<void> {
    if (releases.length > 0) {
      await this.attempt([], releases);
    }
  }

  // Takes all the hours or none. `releases` are given back in the same step (moving a booking).
  // `isLive` says whether a holder still stands for something real; hours held by something that no longer exists
  // (a crash between claiming and saving, or a failed release) are cleared and the claim is tried again.
  async claim(
    claims: SlotRef[],
    releases: SlotRef[],
    isLive: (holder: ParsedHolder) => Promise<boolean>
  ): Promise<ClaimResult> {
    for (let round = 0; round < 3; round++) {
      const taken = await this.attempt(claims, releases);
      if (taken.length === 0) {
        return { ok: true };
      }
      const live: TakenSlot[] = [];
      const stale: TakenSlot[] = [];
      for (const slot of taken) {
        ((await isLive(parseHolder(slot.holder))) ? live : stale).push(slot);
      }
      await this.release(stale);
      if (live.length > 0) {
        return { ok: false, taken: live };
      }
    }
    return { ok: false, taken: [] };
  }

  // Every held hour of one UTC day: hour field to holder.
  async readDay(courtId: string, day: string): Promise<Map<number, string>> {
    const reply = await RedisClient.execute("HGETALL", `slots:{${courtId}}:${day}`);
    const entries = new Map<number, string>();
    if (Array.isArray(reply)) {
      for (let i = 0; i < reply.length; i += 2) {
        entries.set(Number(reply[i]), String(reply[i + 1]));
      }
    } else if (reply && typeof reply === "object") {
      for (const [field, holder] of Object.entries(reply)) {
        entries.set(Number(field), String(holder));
      }
    }
    return entries;
  }
}
