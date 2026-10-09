import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import SlotRepository, { makeHolder } from "../src/repositories/slotRepository";
import { setClock } from "../src/services/clock";
import { api, bearer, createClub, createCourt, createLooseCourt, playerWithRole, Session } from "./helpers";

// Friday 9 October 2026, 10:00 in Belgrade (summer time, UTC+2). Winter time starts on Sunday 25 October.
let admin: Session;
let clubAdmin: Session;
let player: Session;
let other: Session;
let clubId: string;
let courtId: string;

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  clubId = await createClub(admin.token);
  clubAdmin = await playerWithRole(Role.CLUB_ADMIN, clubId);
  courtId = await createCourt(clubAdmin.token, clubId);
  player = await playerWithRole(Role.PLAYER);
  other = await playerWithRole(Role.PLAYER);
});

const book = (session: Session, body: Record<string, unknown>) =>
  api()
    .post("/bookings")
    .set(bearer(session.token))
    .send({ courtId, bookingType: "ONE_TIME", ...body });

const at = (startsAt: string, endsAt: string) => ({ startsAt, endsAt });
// Saturday 10 October, 18:00 to 20:00 in Belgrade.
const SATURDAY = at("2026-10-10T16:00:00Z", "2026-10-10T18:00:00Z");

const availability = async (date: string, id = courtId) =>
  (await api().get(`/courts/${id}/availability?date=${date}`).set(bearer(player.token)).expect(200)).body;
const statusAt = (body: { slots: { localTime: string; status: string }[] }, localTime: string) =>
  body.slots.find((slot) => slot.localTime === localTime)?.status;

describe("no double booking", () => {
  it("gives an hour to exactly one of twenty parallel requests", async () => {
    const players = await Promise.all(Array.from({ length: 20 }, () => playerWithRole(Role.PLAYER)));
    const responses = await Promise.all(
      players.map((p) => book(p, at("2026-10-10T16:00:00Z", "2026-10-10T17:00:00Z")))
    );

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    const lost = responses.filter((r) => r.status === 409);
    expect(lost).toHaveLength(19);
    for (const response of lost) {
      expect(response.body.error.code).toBe("SLOT_TAKEN");
      expect(response.body.error.fields.slots).toEqual(["2026-10-10T16:00:00.000Z"]);
    }
  });

  it("names only the hours that clash, and lets bookings that touch each other through", async () => {
    await book(player, SATURDAY).expect(201);
    const clash = await book(other, at("2026-10-10T17:00:00Z", "2026-10-10T19:00:00Z")).expect(409);
    expect(clash.body.error.fields.slots).toEqual(["2026-10-10T17:00:00.000Z"]);

    await book(other, at("2026-10-10T18:00:00Z", "2026-10-10T19:00:00Z")).expect(201);
    await book(other, at("2026-10-10T15:00:00Z", "2026-10-10T16:00:00Z")).expect(201);
  });

  it("keeps courts apart", async () => {
    const second = await createCourt(clubAdmin.token, clubId, { name: "Court 2" });
    await book(player, SATURDAY).expect(201);
    await book(other, { ...SATURDAY, courtId: second }).expect(201);
  });

  it("works across midnight UTC, which touches two day hashes", async () => {
    await api()
      .patch(`/clubs/${clubId}`)
      .set(bearer(clubAdmin.token))
      .send({ openingHours: Array.from({ length: 7 }, () => ({ open: "00:00", close: "24:00" })) })
      .expect(200);
    // 23:00 and 00:00 UTC are 01:00 and 02:00 in Belgrade.
    await book(player, at("2026-10-10T22:00:00Z", "2026-10-11T01:00:00Z")).expect(201);
    const clash = await book(other, at("2026-10-11T00:00:00Z", "2026-10-11T01:00:00Z")).expect(409);
    expect(clash.body.error.fields.slots).toEqual(["2026-10-11T00:00:00.000Z"]);
    expect(statusAt(await availability("2026-10-11"), "00:00")).toBe("BOOKED");
    expect(statusAt(await availability("2026-10-11"), "02:00")).toBe("BOOKED");
  });

  it("treats an hour held by a booking that no longer exists as free", async () => {
    // A crash left an hour claimed for a booking that was never saved.
    await new SlotRepository().claim(
      [{ courtId, hour: new Date("2026-10-10T16:00:00Z"), holder: makeHolder("b", "ghost") }],
      [],
      async () => true
    );
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("FREE");
    await book(player, SATURDAY).expect(201);
  });
});

describe("the rules of a booking", () => {
  it("refuses a time outside the opening hours", async () => {
    // The default is 06:00 to 23:00. 03:00 UTC is 05:00 in Belgrade, and 20:00 to 22:00 UTC is 22:00 to 24:00.
    await book(player, at("2026-10-10T03:00:00Z", "2026-10-10T04:00:00Z")).expect(400);
    const late = await book(player, at("2026-10-10T20:00:00Z", "2026-10-10T22:00:00Z")).expect(400);
    expect(late.body.error.code).toBe("OUTSIDE_OPENING_HOURS");
    await book(player, at("2026-10-10T20:00:00Z", "2026-10-10T21:00:00Z")).expect(201);
  });

  it("follows opening hours that the club sets, per weekday", async () => {
    const hours = Array.from({ length: 7 }, () => ({ open: "08:00", close: "22:00" }));
    hours[5] = null as never;
    await api().patch(`/clubs/${clubId}`).set(bearer(clubAdmin.token)).send({ openingHours: hours }).expect(200);
    // Saturday is closed all day.
    const closed = await book(player, SATURDAY).expect(400);
    expect(closed.body.error.code).toBe("OUTSIDE_OPENING_HOURS");
    await book(player, at("2026-10-11T08:00:00Z", "2026-10-11T09:00:00Z")).expect(201);
  });

  it("refuses a closed court, but keeps its bookings", async () => {
    const id = await book(player, SATURDAY).expect(201);
    await api().patch(`/courts/${courtId}`).set(bearer(clubAdmin.token)).send({ active: false }).expect(200);
    const refused = await book(other, at("2026-10-11T16:00:00Z", "2026-10-11T17:00:00Z")).expect(409);
    expect(refused.body.error.code).toBe("COURT_CLOSED");
    await api().get(`/bookings/${id.body.id}`).set(bearer(player.token)).expect(200);
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("CLOSED");
  });

  it("refuses a start in the past and one too far ahead", async () => {
    const past = await book(player, at("2026-10-09T06:00:00Z", "2026-10-09T07:00:00Z")).expect(400);
    expect(past.body.error.code).toBe("BOOKING_IN_PAST");
    const far = await book(player, at("2027-02-10T16:00:00Z", "2027-02-10T17:00:00Z")).expect(400);
    expect(far.body.error.code).toBe("VALIDATION_FAILED");
    expect(far.body.error.fields.startsAt).toBeDefined();
  });

  it("prices a booking from the court and the number of hours", async () => {
    const created = await book(player, SATURDAY).expect(201);
    expect(created.body.totalPrice).toEqual({ amountMinor: 200000, currency: "RSD" });
    expect(created.body.status).toBe("CONFIRMED");
  });

  it("can be booked on a court without a club, which follows its owner's own hours", async () => {
    const owner = await playerWithRole(Role.PLAYER);
    const loose = await createLooseCourt(owner.token, { timeZone: "Europe/Belgrade" });
    await book(player, { ...SATURDAY, courtId: loose }).expect(201);
    await book(other, { ...SATURDAY, courtId: loose }).expect(409);
  });

  it("asks for partners in the same request", async () => {
    const created = await book(player, { ...SATURDAY, partnerRequest: { playersNeeded: 1 } }).expect(201);
    const requests = await api().get("/partner-requests").set(bearer(other.token)).expect(200);
    expect(requests.body.items).toHaveLength(1);
    expect(requests.body.items[0].booking.id).toBe(created.body.id);
  });
});

describe("repeat bookings", () => {
  it("makes four weekly bookings for MONTH, all together or none", async () => {
    const created = await book(player, { ...SATURDAY, bookingType: "MONTH" }).expect(201);
    expect(created.body.seriesId).toEqual(expect.any(String));
    const series = await api().get(`/bookings?seriesId=${created.body.seriesId}`).set(bearer(player.token)).expect(200);
    expect(series.body.items.map((b: { startsAt: string }) => b.startsAt)).toEqual([
      "2026-10-10T16:00:00.000Z",
      "2026-10-17T16:00:00.000Z",
      "2026-10-24T16:00:00.000Z",
      // The clocks went back on 25 October, so 18:00 is one hour later in UTC.
      "2026-10-31T17:00:00.000Z",
    ]);

    // Another player has the third Saturday; their series would clash, so nothing is made.
    await book(other, at("2026-11-07T17:00:00Z", "2026-11-07T18:00:00Z")).expect(201);
    const before = (await api().get("/bookings").set(bearer(other.token)).expect(200)).body.items.length;
    const clash = await book(other, {
      ...at("2026-10-31T17:00:00Z", "2026-10-31T19:00:00Z"),
      bookingType: "MONTH",
    }).expect(409);
    expect(clash.body.error.code).toBe("SLOT_TAKEN");
    const after = (await api().get("/bookings").set(bearer(other.token)).expect(200)).body.items.length;
    expect(after).toBe(before);
    expect(statusAt(await availability("2026-11-14"), "18:00")).toBe("FREE");
  });

  it("runs a season up to the club's season end", async () => {
    await api().patch(`/clubs/${clubId}`).set(bearer(clubAdmin.token)).send({ seasonEndsOn: "2026-11-07" }).expect(200);
    const created = await book(player, { ...SATURDAY, bookingType: "SEASON" }).expect(201);
    const series = await api().get(`/bookings?seriesId=${created.body.seriesId}`).set(bearer(player.token)).expect(200);
    // 10, 17, 24, 31 October and 7 November.
    expect(series.body.items).toHaveLength(5);
  });

  it("runs a season for twelve weeks when the club has no end date", async () => {
    const created = await book(player, { ...SATURDAY, bookingType: "SEASON" }).expect(201);
    const series = await api()
      .get(`/bookings?seriesId=${created.body.seriesId}&limit=50`)
      .set(bearer(player.token))
      .expect(200);
    expect(series.body.items).toHaveLength(12);
  });
});

describe("cancelling", () => {
  it("lets a player cancel up to the club's cut-off, and frees the hours", async () => {
    const created = await book(player, SATURDAY).expect(201);
    const cancelled = await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(player.token)).expect(200);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("FREE");

    // Cancelled bookings are left out of the list, unless asked for.
    const list = await api().get("/bookings").set(bearer(player.token)).expect(200);
    expect(list.body.items).toHaveLength(0);
    const cancelledList = await api().get("/bookings?status=CANCELLED").set(bearer(player.token)).expect(200);
    expect(cancelledList.body.items).toHaveLength(1);

    await book(other, SATURDAY).expect(201);
    // Cancelling twice does nothing.
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(player.token)).expect(200);
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("BOOKED");
  });

  it("refuses a player inside the cut-off, but not the club's admin", async () => {
    // Today 18:00 to 20:00 Belgrade time is eight hours away; the cut-off is 24 hours.
    const created = await book(player, at("2026-10-09T16:00:00Z", "2026-10-09T18:00:00Z")).expect(201);
    const refused = await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(player.token)).expect(409);
    expect(refused.body.error.code).toBe("CANCEL_TOO_LATE");
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(clubAdmin.token)).expect(200);
  });

  it("uses the cut-off the club sets", async () => {
    await api().patch(`/clubs/${clubId}`).set(bearer(clubAdmin.token)).send({ cancelCutoffHours: 2 }).expect(200);
    const created = await book(player, at("2026-10-09T16:00:00Z", "2026-10-09T18:00:00Z")).expect(201);
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(player.token)).expect(200);
  });

  it("does not let another player cancel it", async () => {
    const created = await book(player, SATURDAY).expect(201);
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(other.token)).expect(403);
  });

  it("lets the owner of a court without a club cancel at any time", async () => {
    const owner = await playerWithRole(Role.PLAYER);
    const loose = await createLooseCourt(owner.token);
    const created = await book(player, {
      ...at("2026-10-09T16:00:00Z", "2026-10-09T17:00:00Z"),
      courtId: loose,
    }).expect(201);
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(owner.token)).expect(200);
  });

  it("cancels this booking and the later ones of a series", async () => {
    const created = await book(player, { ...SATURDAY, bookingType: "MONTH" }).expect(201);
    const all = (await api().get(`/bookings?seriesId=${created.body.seriesId}`).set(bearer(player.token))).body.items;
    // Cancel from the second one on.
    await api().post(`/bookings/${all[1].id}/cancel?series=true`).set(bearer(player.token)).expect(200);
    const left = (await api().get(`/bookings?seriesId=${created.body.seriesId}`).set(bearer(player.token))).body.items;
    expect(left.map((b: { id: string }) => b.id)).toEqual([all[0].id]);
    expect(statusAt(await availability("2026-10-17"), "18:00")).toBe("FREE");
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("BOOKED");
  });

  it("closes the partner requests of a cancelled booking", async () => {
    const created = await book(player, { ...SATURDAY, partnerRequest: { playersNeeded: 1 } }).expect(201);
    await api().post(`/bookings/${created.body.id}/cancel`).set(bearer(player.token)).expect(200);
    const requests = await api().get("/partner-requests").set(bearer(other.token)).expect(200);
    expect(requests.body.items).toHaveLength(0);
  });
});

describe("moving a booking", () => {
  it("gives back the old hours and takes the new ones", async () => {
    const created = await book(player, SATURDAY).expect(201);
    const moved = await api()
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(player.token))
      .send(at("2026-10-10T17:00:00Z", "2026-10-10T19:00:00Z"))
      .expect(200);
    expect(moved.body.startsAt).toBe("2026-10-10T17:00:00.000Z");
    const day = await availability("2026-10-10");
    expect(statusAt(day, "18:00")).toBe("FREE");
    expect(statusAt(day, "19:00")).toBe("BOOKED");
    expect(statusAt(day, "20:00")).toBe("BOOKED");
  });

  it("keeps the booking where it was when the new hours are taken", async () => {
    await book(other, at("2026-10-10T18:00:00Z", "2026-10-10T19:00:00Z")).expect(201);
    const created = await book(player, SATURDAY).expect(201);
    const refused = await api()
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(player.token))
      .send(at("2026-10-10T17:00:00Z", "2026-10-10T19:00:00Z"))
      .expect(409);
    expect(refused.body.error.code).toBe("SLOT_TAKEN");
    const same = await api().get(`/bookings/${created.body.id}`).set(bearer(player.token)).expect(200);
    expect(same.body.startsAt).toBe("2026-10-10T16:00:00.000Z");
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("BOOKED");
  });

  it("can move to another court, and reprices", async () => {
    const dearCourt = await createCourt(clubAdmin.token, clubId, { name: "Court 2", pricePerHourMinor: 150000 });
    const created = await book(player, SATURDAY).expect(201);
    const moved = await api()
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(player.token))
      .send({ courtId: dearCourt })
      .expect(200);
    expect(moved.body.totalPrice.amountMinor).toBe(300000);
    expect(statusAt(await availability("2026-10-10"), "18:00")).toBe("FREE");
    expect(statusAt(await availability("2026-10-10", dearCourt), "18:00")).toBe("BOOKED");
  });
});

describe("availability", () => {
  it("lists every hour of the local day with what each one is", async () => {
    await book(player, SATURDAY).expect(201);
    const body = await availability("2026-10-10");
    expect(body).toMatchObject({ courtId, date: "2026-10-10", timeZone: "Europe/Belgrade" });
    expect(body.pricePerHour).toEqual({ amountMinor: 100000, currency: "RSD" });
    expect(body.slots).toHaveLength(24);
    expect(body.slots[0]).toMatchObject({ localTime: "00:00", startsAt: "2026-10-09T22:00:00.000Z", status: "CLOSED" });
    expect(statusAt(body, "05:00")).toBe("CLOSED");
    expect(statusAt(body, "06:00")).toBe("FREE");
    expect(statusAt(body, "18:00")).toBe("BOOKED");
    expect(statusAt(body, "19:00")).toBe("BOOKED");
    expect(statusAt(body, "20:00")).toBe("FREE");
    expect(statusAt(body, "23:00")).toBe("CLOSED");
  });

  it("shows hours that are past as closed", async () => {
    const body = await availability("2026-10-09");
    expect(statusAt(body, "09:00")).toBe("CLOSED");
    expect(statusAt(body, "10:00")).toBe("CLOSED");
    expect(statusAt(body, "11:00")).toBe("FREE");
  });

  it("has 25 hours on the day the clocks go back", async () => {
    expect((await availability("2026-10-25")).slots).toHaveLength(25);
  });

  it("is the same for a court without a club", async () => {
    const loose = await createLooseCourt(player.token);
    const body = await availability("2026-10-10", loose);
    expect(statusAt(body, "10:00")).toBe("FREE");
  });

  it("needs a real date and an existing court", async () => {
    await api().get(`/courts/${courtId}/availability?date=tomorrow`).set(bearer(player.token)).expect(400);
    await api().get(`/courts/${courtId}/availability`).set(bearer(player.token)).expect(400);
    await api().get("/courts/nope/availability?date=2026-10-10").set(bearer(player.token)).expect(404);
    await api().get(`/courts/${courtId}/availability?date=2026-10-10`).expect(401);
  });
});

describe("club settings", () => {
  it("validates opening hours, time zone and cut-off", async () => {
    const patch = (body: object) => api().patch(`/clubs/${clubId}`).set(bearer(clubAdmin.token)).send(body);
    await patch({ timeZone: "Mars/Olympus" }).expect(400);
    await patch({ openingHours: [{ open: "08:00", close: "22:00" }] }).expect(400);
    await patch({ openingHours: Array.from({ length: 7 }, () => ({ open: "22:00", close: "08:00" })) }).expect(400);
    await patch({ cancelCutoffHours: -1 }).expect(400);
    await patch({ seasonEndsOn: "soon" }).expect(400);
    const ok = await patch({ timeZone: "Europe/London", cancelCutoffHours: 0, seasonEndsOn: "2027-03-31" }).expect(200);
    expect(ok.body).toMatchObject({ timeZone: "Europe/London", cancelCutoffHours: 0, seasonEndsOn: "2027-03-31" });
    const cleared = await patch({ seasonEndsOn: "" }).expect(200);
    expect(cleared.body.seasonEndsOn).toBeNull();
  });

  it("lets a club court keep hours of its own, and go back to the club's", async () => {
    const own = Array.from({ length: 7 }, () => ({ open: "10:00", close: "12:00" }));
    const court = await api()
      .patch(`/courts/${courtId}`)
      .set(bearer(clubAdmin.token))
      .send({ openingHours: own })
      .expect(200);
    expect(court.body.openingHours[0]).toEqual({ open: "10:00", close: "12:00" });
    await book(player, SATURDAY).expect(400);
    const back = await api()
      .patch(`/courts/${courtId}`)
      .set(bearer(clubAdmin.token))
      .send({ followClubHours: true })
      .expect(200);
    expect(back.body.openingHours[0]).toEqual({ open: "06:00", close: "23:00" });
    await book(player, SATURDAY).expect(201);
  });

  it("does not let a club court have its own time zone", async () => {
    await api()
      .patch(`/courts/${courtId}`)
      .set(bearer(clubAdmin.token))
      .send({ timeZone: "Europe/London" })
      .expect(400);
  });
});

setClock(null);
