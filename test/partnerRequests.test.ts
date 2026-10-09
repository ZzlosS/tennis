import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { setClock } from "../src/services/clock";
import { api, bearer, createBooking, createClub, createCourt, playerWithRole, Session } from "./helpers";

let admin: Session;
let owner: Session;
let courtId: string;

const two = (n: number) => String(n).padStart(2, "0");
const day = (n: number, hour = 10) => ({
  startsAt: `2026-11-${two(n)}T${two(hour)}:00:00Z`,
  endsAt: `2026-11-${two(n)}T${two(hour + 1)}:00:00Z`,
});

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  courtId = await createCourt(admin.token, await createClub(admin.token));
  owner = await playerWithRole(Role.PLAYER);
});

const ask = async (when = day(2), body: Record<string, unknown> = { playersNeeded: 1 }) => {
  const booking = await createBooking(owner.token, courtId, when);
  const response = await api()
    .post("/partner-requests")
    .set(bearer(owner.token))
    .send({ bookingId: booking, ...body })
    .expect(201);
  return { booking, id: response.body.id as string, body: response.body };
};
const list = async (query = "") =>
  (await api().get(`/partner-requests${query}`).set(bearer(owner.token)).expect(200)).body.items as {
    id: string;
    level: string | null;
    playersNeeded: number;
  }[];

describe("joining", () => {
  it("gives the last place to exactly one of many players asking at once", async () => {
    const { id } = await ask();
    const players = await Promise.all(Array.from({ length: 10 }, () => playerWithRole(Role.PLAYER)));
    const answers = await Promise.all(
      players.map((p) => api().post(`/partner-requests/${id}/join`).set(bearer(p.token)))
    );
    expect(answers.filter((a) => a.status === 200)).toHaveLength(1);
    const lost = answers.filter((a) => a.status === 409);
    expect(lost).toHaveLength(9);
    expect(lost.every((a) => a.body.error.code === "REQUEST_FULL")).toBe(true);
    const request = (await api().get(`/partner-requests/${id}`).set(bearer(owner.token)).expect(200)).body;
    expect(request.joined).toHaveLength(1);
    expect(request.status).toBe("CLOSED");
    expect(request.spotsLeft).toBe(0);
  });

  it("lets a player leave, which reopens the request", async () => {
    const { id } = await ask();
    const player = await playerWithRole(Role.PLAYER);
    await api().post(`/partner-requests/${id}/leave`).set(bearer(player.token)).expect(409);
    await api().post(`/partner-requests/${id}/join`).set(bearer(player.token)).expect(200);
    const left = await api().post(`/partner-requests/${id}/leave`).set(bearer(player.token)).expect(200);
    expect(left.body).toMatchObject({ joined: [], status: "OPEN", spotsLeft: 1 });
    await api().post(`/partner-requests/${id}/join`).set(bearer(player.token)).expect(200);
  });

  it("refuses to join once the booking has started", async () => {
    const { id } = await ask();
    const player = await playerWithRole(Role.PLAYER);
    setClock(new Date("2026-11-02T10:30:00Z"));
    const response = await api().post(`/partner-requests/${id}/join`).set(bearer(player.token)).expect(409);
    expect(response.body.error.code).toBe("BOOKING_IN_PAST");
  });
});

describe("asking", () => {
  it("needs a confirmed booking that has not started", async () => {
    const booking = await createBooking(owner.token, courtId, day(2));
    await api().post(`/bookings/${booking}/cancel`).set(bearer(admin.token)).expect(200);
    await api()
      .post("/partner-requests")
      .set(bearer(owner.token))
      .send({ bookingId: booking, playersNeeded: 1 })
      .expect(409);

    const later = await createBooking(owner.token, courtId, day(3));
    setClock(new Date("2026-11-03T10:30:00Z"));
    const late = await api()
      .post("/partner-requests")
      .set(bearer(owner.token))
      .send({ bookingId: later, playersNeeded: 1 })
      .expect(409);
    expect(late.body.error.code).toBe("BOOKING_IN_PAST");
  });

  it("follows the booking when it moves", async () => {
    const { id, booking } = await ask(day(2));
    await api()
      .patch(`/bookings/${booking}`)
      .set(bearer(owner.token))
      .send({ startsAt: day(9).startsAt, endsAt: day(9).endsAt })
      .expect(200);
    expect(await list("?from=2026-11-08T00:00:00Z&to=2026-11-10T00:00:00Z")).toHaveLength(1);
    expect(await list("?from=2026-11-01T00:00:00Z&to=2026-11-03T00:00:00Z")).toEqual([]);
    expect((await list()).map((r) => r.id)).toEqual([id]);
  });

  it("reopens a full request when more players are wanted", async () => {
    const { id } = await ask();
    const player = await playerWithRole(Role.PLAYER);
    await api().post(`/partner-requests/${id}/join`).set(bearer(player.token)).expect(200);
    const raised = await api()
      .patch(`/partner-requests/${id}`)
      .set(bearer(owner.token))
      .send({ playersNeeded: 3 })
      .expect(200);
    expect(raised.body).toMatchObject({ status: "OPEN", spotsLeft: 2 });
  });
});

describe("the feed", () => {
  it("lists the soonest booking first, and hides the ones that have started", async () => {
    const later = await ask(day(9));
    const sooner = await ask(day(2));
    expect((await list()).map((r) => r.id)).toEqual([sooner.id, later.id]);

    setClock(new Date("2026-11-02T10:30:00Z"));
    expect((await list()).map((r) => r.id)).toEqual([later.id]);
  });

  it("filters by level (and requests open to any), time and doubles", async () => {
    const pro = await ask(day(2, 8), { playersNeeded: 1, level: "PRO" });
    const any = await ask(day(3, 8), { playersNeeded: 3 });
    const newbie = await ask(day(4, 8), { playersNeeded: 2, level: "BEGINNER" });

    expect((await list("?level=PRO")).map((r) => r.id)).toEqual([pro.id, any.id]);
    expect((await list("?level=BEGINNER")).map((r) => r.id)).toEqual([any.id, newbie.id]);
    expect((await list("?doubles=true")).map((r) => r.id)).toEqual([any.id]);
    expect((await list("?doubles=false")).map((r) => r.id)).toEqual([pro.id, newbie.id]);
    expect((await list("?from=2026-11-03T00:00:00Z&to=2026-11-04T00:00:00Z")).map((r) => r.id)).toEqual([any.id]);
    expect((await list("?level=PRO")).map((r) => r.level)).toEqual(["PRO", null]);
    await api().get("/partner-requests?from=yesterday").set(bearer(owner.token)).expect(400);
  });
});
