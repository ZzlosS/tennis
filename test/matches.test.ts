import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { scoreProblem } from "../src/services/tennisScore";
import StatsService from "../src/services/statsService";
import { api, bearer, createClub, createCourt, playerWithRole, registerPlayer, Session, TestPlayer } from "./helpers";

const sets = (...scores: [number, number][]) => scores.map(([firstTeam, secondTeam]) => ({ firstTeam, secondTeam }));

describe("tennis scores", () => {
  it.each([
    [
      "two straight sets",
      [
        [6, 4],
        [6, 3],
      ],
    ],
    [
      "a tie-break set",
      [
        [7, 6],
        [6, 0],
      ],
    ],
    [
      "three sets",
      [
        [6, 4],
        [3, 6],
        [7, 5],
      ],
    ],
    [
      "a match tie-break as the deciding set",
      [
        [6, 4],
        [3, 6],
        [10, 8],
      ],
    ],
    [
      "a long deciding set",
      [
        [6, 4],
        [3, 6],
        [9, 7],
      ],
    ],
    [
      "five sets",
      [
        [6, 4],
        [3, 6],
        [6, 4],
        [4, 6],
        [6, 2],
      ],
    ],
    [
      "three straight sets of five",
      [
        [6, 0],
        [6, 0],
        [6, 0],
      ],
    ],
  ] as [string, [number, number][]][])("accepts %s", (_name, scores) => {
    expect(scoreProblem(sets(...scores))).toBeNull();
  });

  it.each([
    [
      "a set that ends level",
      [
        [6, 6],
        [6, 0],
      ],
    ],
    [
      "a set that is not finished",
      [
        [6, 5],
        [6, 0],
      ],
    ],
    [
      "seven games against four",
      [
        [7, 4],
        [6, 0],
      ],
    ],
    [
      "a set that goes past 7-6",
      [
        [8, 6],
        [6, 0],
      ],
    ],
    [
      "a match tie-break that is not the deciding set",
      [
        [10, 8],
        [6, 4],
      ],
    ],
    ["a match that is not finished", [[6, 4]]],
    [
      "a match that is level",
      [
        [6, 4],
        [4, 6],
      ],
    ],
    [
      "sets after the match was decided",
      [
        [6, 4],
        [6, 4],
        [6, 4],
        [6, 4],
      ],
    ],
  ] as [string, [number, number][]][])("rejects %s", (_name, scores) => {
    expect(scoreProblem(sets(...scores))).not.toBeNull();
  });
});

let admin: Session;
let courtId: string;
let alice: TestPlayer;
let bob: TestPlayer;
let carol: TestPlayer;
let dave: TestPlayer;

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  courtId = await createCourt(admin.token, await createClub(admin.token));
  [alice, bob, carol, dave] = await Promise.all([
    registerPlayer(),
    registerPlayer(),
    registerPlayer(),
    registerPlayer(),
  ]);
});

const record = (by: TestPlayer, first: string[], second: string[], score = sets([6, 4], [6, 3])) =>
  api()
    .post("/matches")
    .set(bearer(by.accessToken))
    .send({ firstTeam: first, secondTeam: second, sets: score, courtId, playedAt: "2026-10-01T10:00:00Z" });
const stats = async (p: TestPlayer) =>
  (await api().get(`/players/${p.id}/stats`).set(bearer(alice.accessToken)).expect(200)).body;

describe("recording and confirming", () => {
  it("rejects scores that are not tennis, with a message on sets", async () => {
    const response = await record(alice, [alice.id], [bob.id], sets([6, 5], [6, 0])).expect(400);
    expect(response.body.error.fields.sets[0]).toMatch(/Set 1/);
  });

  it("waits for the other team, and counts only after they confirm", async () => {
    const created = (await record(alice, [alice.id], [bob.id]).expect(201)).body;
    expect(created.status).toBe("PENDING");
    expect(created.createdBy.id).toBe(alice.id);
    expect((await stats(alice)).matches).toBe(0);

    await api().post(`/matches/${created.id}/confirm`).set(bearer(alice.accessToken)).expect(403);
    await api().post(`/matches/${created.id}/confirm`).set(bearer(carol.accessToken)).expect(403);
    const confirmed = await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(200);
    expect(confirmed.body.status).toBe("CONFIRMED");

    expect(await stats(alice)).toEqual({
      matches: 1,
      wins: 1,
      losses: 0,
      winRate: 1,
      setsWon: 2,
      setsLost: 0,
      gamesWon: 12,
      gamesLost: 7,
    });
    expect(await stats(bob)).toMatchObject({
      matches: 1,
      wins: 0,
      losses: 1,
      winRate: 0,
      setsWon: 0,
      setsLost: 2,
      gamesWon: 7,
      gamesLost: 12,
    });
    const again = await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(409);
    expect(again.body.error.code).toBe("MATCH_NOT_PENDING");
    expect((await stats(alice)).matches).toBe(1);
  });

  it("counts a match once when both opponents confirm at the same moment", async () => {
    const created = (await record(alice, [alice.id, carol.id], [bob.id, dave.id]).expect(201)).body;
    const answers = await Promise.all(
      [bob, dave].map((p) => api().post(`/matches/${created.id}/confirm`).set(bearer(p.accessToken)))
    );
    expect(answers.map((a) => a.status).sort()).toEqual([200, 409]);
    expect((await stats(alice)).matches).toBe(1);
    expect((await stats(dave)).matches).toBe(1);
  });

  it("lets the other team dispute, and a corrected score asks again", async () => {
    const created = (await record(alice, [alice.id], [bob.id]).expect(201)).body;
    const disputed = await api().post(`/matches/${created.id}/dispute`).set(bearer(bob.accessToken)).expect(200);
    expect(disputed.body.status).toBe("DISPUTED");
    await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(409);

    const fixed = await api()
      .patch(`/matches/${created.id}`)
      .set(bearer(alice.accessToken))
      .send({ sets: sets([4, 6], [3, 6]) })
      .expect(200);
    expect(fixed.body).toMatchObject({ status: "PENDING", createdBy: { id: alice.id } });
    await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(200);
    expect((await stats(bob)).wins).toBe(1);
  });

  it("lists my matches with their status, newest first, and filters by status", async () => {
    const first = (await record(alice, [alice.id], [bob.id]).expect(201)).body;
    await api().post(`/matches/${first.id}/confirm`).set(bearer(bob.accessToken)).expect(200);
    const second = (await record(bob, [bob.id], [alice.id]).expect(201)).body;
    const mine = await api().get("/me/matches").set(bearer(alice.accessToken)).expect(200);
    expect(mine.body.items.map((m: { id: string }) => m.id).sort()).toEqual([first.id, second.id].sort());
    const pending = await api().get("/me/matches?status=PENDING").set(bearer(alice.accessToken)).expect(200);
    expect(pending.body.items.map((m: { id: string }) => m.id)).toEqual([second.id]);
    const nothing = await api().get("/me/matches").set(bearer(carol.accessToken)).expect(200);
    expect(nothing.body.items).toEqual([]);
    expect((await api().get("/me/stats").set(bearer(alice.accessToken)).expect(200)).body.matches).toBe(1);
  });
});

describe("confirmed matches", () => {
  it("are locked for players; an ADMIN can fix or remove them and the stats follow", async () => {
    const created = (await record(alice, [alice.id], [bob.id]).expect(201)).body;
    await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(200);
    const locked = await api()
      .patch(`/matches/${created.id}`)
      .set(bearer(alice.accessToken))
      .send({ sets: sets([6, 0], [6, 0]) })
      .expect(409);
    expect(locked.body.error.code).toBe("MATCH_NOT_PENDING");
    await api().delete(`/matches/${created.id}`).set(bearer(alice.accessToken)).expect(409);

    await api()
      .patch(`/matches/${created.id}`)
      .set(bearer(admin.token))
      .send({ sets: sets([4, 6], [4, 6]) })
      .expect(200);
    expect(await stats(alice)).toMatchObject({ matches: 1, wins: 0, losses: 1, gamesWon: 8 });

    await api().delete(`/matches/${created.id}`).set(bearer(admin.token)).expect(204);
    expect(await stats(alice)).toMatchObject({ matches: 0, wins: 0, losses: 0, winRate: null, gamesWon: 0 });
  });

  it("are counted straight away when an ADMIN who did not play records them", async () => {
    const created = (
      await api()
        .post("/matches")
        .set(bearer(admin.token))
        .send({
          firstTeam: [alice.id],
          secondTeam: [bob.id],
          sets: sets([6, 1], [6, 1]),
          courtId,
          playedAt: "2026-10-01T10:00:00Z",
        })
        .expect(201)
    ).body;
    expect(created.status).toBe("CONFIRMED");
    expect((await stats(bob)).losses).toBe(1);
  });

  it("can be added up again from scratch", async () => {
    const created = (await record(alice, [alice.id], [bob.id]).expect(201)).body;
    await api().post(`/matches/${created.id}/confirm`).set(bearer(bob.accessToken)).expect(200);
    await record(alice, [alice.id], [carol.id]).expect(201);
    expect(await new StatsService().rebuild()).toBe(1);
    expect(await stats(alice)).toMatchObject({ matches: 1, wins: 1 });
    expect((await stats(carol)).matches).toBe(0);
  });

  it("gives an unknown player a 404", async () => {
    await api().get("/players/missing/stats").set(bearer(alice.accessToken)).expect(404);
  });
});
