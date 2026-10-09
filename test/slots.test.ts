import { describe, expect, it } from "vitest";
import { claimSlots, runScript } from "../src/redis/scripts";
import SlotRepository, { makeHolder, parseHolder } from "../src/repositories/slotRepository";
import RedisClient from "../src/services/redisClient";

const repository = new SlotRepository();
const hour = (h: number, day = "2026-11-01") => new Date(`${day}T${String(h).padStart(2, "0")}:00:00Z`);
const never = async () => false;
const always = async () => true;

describe("slot claims", () => {
  it("gives an hour to exactly one of many parallel claims", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        repository.claim([{ courtId: "c1", hour: hour(10), holder: makeHolder("b", `b${i}`) }], [], always)
      )
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const lost = results.filter((result) => !result.ok);
    expect(lost).toHaveLength(19);
    expect(lost.every((result) => !result.ok && result.taken.length === 1)).toBe(true);
  });

  it("writes nothing when one of several hours is taken", async () => {
    const first = makeHolder("b", "first");
    expect((await repository.claim([{ courtId: "c1", hour: hour(11), holder: first }], [], always)).ok).toBe(true);

    const second = makeHolder("b", "second");
    const result = await repository.claim(
      [10, 11, 12].map((h) => ({ courtId: "c1", hour: hour(h), holder: second })),
      [],
      always
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.taken.map((slot) => slot.hour.toISOString())).toEqual(["2026-11-01T11:00:00.000Z"]);
    }
    const day = await repository.readDay("c1", "2026-11-01");
    expect([...day.keys()]).toEqual([11]);
  });

  it("claims hours across midnight in two day hashes", async () => {
    const holder = makeHolder("b", "late");
    const claims = [23, 24].map((h) => ({ courtId: "c1", hour: new Date(hour(0).getTime() + h * 3_600_000), holder }));
    expect((await repository.claim(claims, [], always)).ok).toBe(true);
    expect([...(await repository.readDay("c1", "2026-11-01")).keys()]).toEqual([23]);
    expect([...(await repository.readDay("c1", "2026-11-02")).keys()]).toEqual([0]);
  });

  it("clears an hour held by something that no longer exists, and takes it", async () => {
    const ghost = makeHolder("b", "ghost");
    await repository.claim([{ courtId: "c1", hour: hour(9), holder: ghost }], [], always);
    const mine = makeHolder("b", "mine");
    const result = await repository.claim([{ courtId: "c1", hour: hour(9), holder: mine }], [], never);
    expect(result.ok).toBe(true);
    expect((await repository.readDay("c1", "2026-11-01")).get(9)).toBe(mine);
  });

  it("moves a booking: the new hours are claimed and the old ones given back in one step", async () => {
    const holder = makeHolder("b", "move");
    await repository.claim(
      [10, 11].map((h) => ({ courtId: "c1", hour: hour(h), holder })),
      [],
      always
    );
    const result = await repository.claim(
      [11, 12].map((h) => ({ courtId: "c1", hour: hour(h), holder })),
      [{ courtId: "c1", hour: hour(10), holder }],
      always
    );
    expect(result.ok).toBe(true);
    expect([...(await repository.readDay("c1", "2026-11-01")).keys()].sort()).toEqual([11, 12]);
  });

  it("only releases an hour that still has the same holder", async () => {
    const mine = makeHolder("b", "mine");
    const theirs = makeHolder("b", "theirs");
    await repository.claim([{ courtId: "c1", hour: hour(8), holder: theirs }], [], always);
    await repository.release([{ courtId: "c1", hour: hour(8), holder: mine }]);
    expect((await repository.readDay("c1", "2026-11-01")).get(8)).toBe(theirs);
  });

  it("lets the day hash expire a week after its day", async () => {
    await repository.claim([{ courtId: "c1", hour: hour(8), holder: makeHolder("b", "x") }], [], always);
    const ttlAt = Number(await RedisClient.execute("EXPIRETIME", "slots:{c1}:2026-11-01"));
    expect(new Date(ttlAt * 1000).toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("parses holders", () => {
    expect(parseHolder("x:abc")).toEqual({ kind: "x", id: "abc" });
  });

  it("reloads a script that Redis forgot", async () => {
    await RedisClient.execute("SCRIPT", "FLUSH");
    const reply = await runScript(
      claimSlots,
      ["slots:{c9}:2026-11-01"],
      [1, 0, 1, "08", "h", Math.floor(Date.now() / 1000) + 100]
    );
    expect(reply).toEqual([]);
  });
});
