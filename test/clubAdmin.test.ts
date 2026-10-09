import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  createLooseCourt,
  playerWithRole,
  Session,
} from "./helpers";

let admin: Session;
let clubAdmin: Session;
let otherClubAdmin: Session;
let player: Session;
let clubId: string;
let courtId: string;

// Sunday 1 November 2026: winter time in Belgrade (UTC+1), so 10:00 UTC is 11:00 local.
const hours = (from: number, to: number) => ({
  startsAt: `2026-11-01T${String(from).padStart(2, "0")}:00:00Z`,
  endsAt: `2026-11-01T${String(to).padStart(2, "0")}:00:00Z`,
});

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  clubId = await createClub(admin.token);
  courtId = await createCourt(admin.token, clubId);
  clubAdmin = await playerWithRole(Role.CLUB_ADMIN, clubId);
  otherClubAdmin = await playerWithRole(Role.CLUB_ADMIN, await createClub(admin.token, { name: "Other" }));
  player = await playerWithRole(Role.PLAYER);
});

describe("the club's day", () => {
  it("shows who holds each hour, and whether it was paid", async () => {
    const booking = await createBooking(player.token, courtId, hours(10, 12));
    await api().post(`/bookings/${booking}/paid`).set(bearer(clubAdmin.token)).expect(200);
    await api()
      .post(`/courts/${courtId}/blocks`)
      .set(bearer(clubAdmin.token))
      .send({ ...hours(14, 16), reason: "Lessons" })
      .expect(201);

    const day = (await api().get(`/clubs/${clubId}/schedule?date=2026-11-01`).set(bearer(clubAdmin.token)).expect(200))
      .body;
    expect(day).toMatchObject({ clubId, date: "2026-11-01", timeZone: "Europe/Belgrade" });
    const slots = day.courts[0].slots as {
      localTime: string;
      status: string;
      booking: { id: string; player: { id: string }; paidAt: string | null } | null;
      block: { reason: string } | null;
    }[];
    const at = (localTime: string) => slots.find((slot) => slot.localTime === localTime)!;
    expect(at("11:00")).toMatchObject({ status: "BOOKED", booking: { id: booking, player: { id: player.id } } });
    expect(at("11:00").booking!.paidAt).toEqual(expect.any(String));
    expect(at("12:00").booking!.id).toBe(booking);
    expect(at("13:00").status).toBe("FREE");
    expect(at("15:00")).toMatchObject({ status: "BLOCKED", block: { reason: "Lessons" }, booking: null });
  });

  it("is for the club's own admins only", async () => {
    await api().get(`/clubs/${clubId}/schedule?date=2026-11-01`).set(bearer(player.token)).expect(403);
    await api().get(`/clubs/${clubId}/schedule?date=2026-11-01`).set(bearer(otherClubAdmin.token)).expect(403);
    await api().get(`/clubs/${clubId}/schedule?date=2026-11-01`).set(bearer(admin.token)).expect(200);
    await api().get(`/clubs/${clubId}/schedule?date=tomorrow`).set(bearer(clubAdmin.token)).expect(400);
  });
});

describe("marking a booking as paid", () => {
  it("is a note that club admins can add and take off, and players cannot", async () => {
    const booking = await createBooking(player.token, courtId, hours(10, 11));
    await api().post(`/bookings/${booking}/paid`).set(bearer(player.token)).expect(403);
    await api().post(`/bookings/${booking}/paid`).set(bearer(otherClubAdmin.token)).expect(403);

    const paid = await api().post(`/bookings/${booking}/paid`).set(bearer(clubAdmin.token)).expect(200);
    expect(paid.body.paidAt).toEqual(expect.any(String));
    const again = await api().post(`/bookings/${booking}/paid`).set(bearer(clubAdmin.token)).expect(200);
    expect(again.body.paidAt).toBe(paid.body.paidAt);
    expect((await api().get(`/bookings/${booking}`).set(bearer(player.token)).expect(200)).body.paidAt).toBe(
      paid.body.paidAt
    );

    const removed = await api().delete(`/bookings/${booking}/paid`).set(bearer(clubAdmin.token)).expect(200);
    expect(removed.body.paidAt).toBeNull();
  });

  it("is refused for a cancelled booking", async () => {
    const booking = await createBooking(player.token, courtId, hours(10, 11));
    await api().post(`/bookings/${booking}/cancel`).set(bearer(clubAdmin.token)).expect(200);
    await api().post(`/bookings/${booking}/paid`).set(bearer(clubAdmin.token)).expect(409);
  });

  it("works for the owner of a court without a club", async () => {
    const owner = await playerWithRole(Role.PLAYER);
    const park = await createLooseCourt(owner.token);
    const booking = await createBooking(player.token, park, hours(10, 11));
    await api().post(`/bookings/${booking}/paid`).set(bearer(owner.token)).expect(200);
  });
});

describe("court blocks", () => {
  const block = (token: string, body: object, id = courtId) =>
    api().post(`/courts/${id}/blocks`).set(bearer(token)).send(body);

  it("keeps hours free so nobody can book them, until the block is removed", async () => {
    const created = (await block(clubAdmin.token, hours(10, 13), courtId).expect(201)).body;
    expect(created).toMatchObject({ startsAt: "2026-11-01T10:00:00.000Z", reason: "" });
    const clash = await api()
      .post("/bookings")
      .set(bearer(player.token))
      .send({ courtId, ...hours(12, 14), bookingType: "ONE_TIME" })
      .expect(409);
    expect(clash.body.error).toMatchObject({ code: "SLOT_TAKEN", fields: { slots: ["2026-11-01T12:00:00.000Z"] } });

    const availability = (
      await api().get(`/courts/${courtId}/availability?date=2026-11-01`).set(bearer(player.token)).expect(200)
    ).body;
    expect(availability.slots.find((s: { localTime: string }) => s.localTime === "12:00").status).toBe("BLOCKED");

    const listed = await api().get(`/courts/${courtId}/blocks`).set(bearer(clubAdmin.token)).expect(200);
    expect(listed.body.items.map((b: { id: string }) => b.id)).toEqual([created.id]);

    await api().delete(`/courts/${courtId}/blocks/${created.id}`).set(bearer(clubAdmin.token)).expect(204);
    await createBooking(player.token, courtId, hours(12, 14));
    expect((await api().get(`/courts/${courtId}/blocks`).set(bearer(clubAdmin.token)).expect(200)).body.items).toEqual(
      []
    );
  });

  it("refuses hours that are already booked, and lists them", async () => {
    await createBooking(player.token, courtId, hours(11, 12));
    const clash = await block(clubAdmin.token, hours(10, 13)).expect(409);
    expect(clash.body.error).toMatchObject({ code: "SLOT_TAKEN", fields: { slots: ["2026-11-01T11:00:00.000Z"] } });
    // Nothing was blocked: the free hours around it can still be booked.
    await createBooking(player.token, courtId, hours(10, 11));
  });

  it("is for the court's managers only", async () => {
    await block(player.token, hours(10, 11)).expect(403);
    await block(otherClubAdmin.token, hours(10, 11)).expect(403);
    await block(admin.token, hours(10, 11)).expect(201);
    const owner = await playerWithRole(Role.PLAYER);
    const park = await createLooseCourt(owner.token);
    await block(owner.token, hours(10, 11), park).expect(201);
    const other = (await block(admin.token, hours(15, 16)).expect(201)).body;
    await api().delete(`/courts/${park}/blocks/${other.id}`).set(bearer(owner.token)).expect(404);
  });

  it("checks the times", async () => {
    await block(clubAdmin.token, { startsAt: "2026-11-01T10:30:00Z", endsAt: "2026-11-01T12:00:00Z" }).expect(400);
    await block(clubAdmin.token, hours(12, 10)).expect(400);
    await block(clubAdmin.token, { startsAt: "2026-11-01T10:00:00Z", endsAt: "2026-12-30T10:00:00Z" }).expect(400);
    await block(clubAdmin.token, { startsAt: "2026-10-01T10:00:00Z", endsAt: "2026-10-01T12:00:00Z" }).expect(400);
  });

  it("lets only one of many parallel blocks and bookings have an hour", async () => {
    const answers = await Promise.all([
      block(clubAdmin.token, hours(10, 11)),
      block(admin.token, hours(10, 11)),
      api()
        .post("/bookings")
        .set(bearer(player.token))
        .send({ courtId, ...hours(10, 11), bookingType: "ONE_TIME" }),
    ]);
    expect(answers.filter((a) => a.status === 201)).toHaveLength(1);
    expect(answers.filter((a) => a.status === 409)).toHaveLength(2);
  });
});
