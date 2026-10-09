import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { setClock } from "../src/services/clock";
import { api, bearer, createBooking, createClub, createCourt, playerWithRole, Session } from "./helpers";

let owner: Session;
let other: Session;
let courtId: string;

const two = (n: number) => String(n).padStart(2, "0");
const day = (n: number) => ({ startsAt: `2026-11-${two(n)}T10:00:00Z`, endsAt: `2026-11-${two(n)}T11:00:00Z` });

beforeEach(async () => {
  const admin = await playerWithRole(Role.ADMIN);
  courtId = await createCourt(admin.token, await createClub(admin.token));
  owner = await playerWithRole(Role.PLAYER);
  other = await playerWithRole(Role.PLAYER);
});

const ask = async (who: Session, n: number, playersNeeded = 1) => {
  const booking = await createBooking(who.token, courtId, day(n));
  const response = await api()
    .post("/partner-requests")
    .set(bearer(who.token))
    .send({ bookingId: booking, playersNeeded })
    .expect(201);
  return { booking, id: response.body.id as string };
};
const mine = async (who: Session, query = "") =>
  (
    (await api().get(`/me/partner-requests${query}`).set(bearer(who.token)).expect(200)).body.items as {
      id: string;
    }[]
  ).map((request) => request.id);

describe("my partner requests", () => {
  it("lists the ones I made and the ones I joined, soonest first, and splits them by role", async () => {
    const later = await ask(owner, 5);
    const sooner = await ask(other, 3);
    await api().post(`/partner-requests/${sooner.id}/join`).set(bearer(owner.token)).expect(200);
    await ask(other, 4);

    expect(await mine(owner)).toEqual([sooner.id, later.id]);
    expect(await mine(owner, "?role=created")).toEqual([later.id]);
    expect(await mine(owner, "?role=joined")).toEqual([sooner.id]);
    // A full request is still mine.
    expect(await mine(other, "?role=created")).toHaveLength(2);
  });

  it("moves them to past once the booking starts", async () => {
    const first = await ask(owner, 3);
    const second = await ask(owner, 5);
    setClock(new Date("2026-11-04T09:00:00Z"));
    expect(await mine(owner)).toEqual([second.id]);
    expect(await mine(owner, "?when=past")).toEqual([first.id]);
  });

  it("refuses an unknown role", async () => {
    await api().get("/me/partner-requests?role=boss").set(bearer(owner.token)).expect(400);
  });
});

describe("a booking's partner request", () => {
  it("is shown on the booking, with the places left", async () => {
    const { booking, id } = await ask(owner, 3, 2);
    const shown = async () =>
      (await api().get(`/bookings/${booking}`).set(bearer(owner.token)).expect(200)).body.partnerRequest;
    expect(await shown()).toEqual({ id, playersNeeded: 2, spotsLeft: 2, status: "OPEN" });

    await api().post(`/partner-requests/${id}/join`).set(bearer(other.token)).expect(200);
    expect(await shown()).toMatchObject({ spotsLeft: 1, status: "OPEN" });

    const mineList = (await api().get("/me/bookings").set(bearer(owner.token)).expect(200)).body.items;
    expect(mineList[0].partnerRequest).toMatchObject({ id, spotsLeft: 1 });
  });

  it("is null when nobody is looked for", async () => {
    const booking = await createBooking(owner.token, courtId, day(3));
    const response = await api().get(`/bookings/${booking}`).set(bearer(owner.token)).expect(200);
    expect(response.body.partnerRequest).toBeNull();
  });
});
