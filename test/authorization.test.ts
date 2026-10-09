import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import RedisClient from "../src/services/redisClient";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  createLooseCourt,
  playerWithRole,
  registerPlayer,
  Session,
} from "./helpers";

// One small world: two clubs with their own admin, two players, one platform admin.
// Courts cost 1000.00 an hour, and booking A is two hours on one of club A's courts.
interface World {
  admin: Session;
  clubA: string;
  clubB: string;
  clubAdminA: Session;
  clubAdminB: Session;
  courtA: string;
  courtB: string;
  playerA: Session;
  playerB: Session;
  bookingA: string;
}

let w: World;

beforeEach(async () => {
  const admin = await playerWithRole(Role.ADMIN);
  const clubA = await createClub(admin.token, { name: "Club A" });
  const clubB = await createClub(admin.token, { name: "Club B" });
  const clubAdminA = await playerWithRole(Role.CLUB_ADMIN, clubA);
  const clubAdminB = await playerWithRole(Role.CLUB_ADMIN, clubB);
  const courtA = await createCourt(clubAdminA.token, clubA);
  const courtB = await createCourt(clubAdminB.token, clubB);
  const playerA = await playerWithRole(Role.PLAYER);
  const playerB = await playerWithRole(Role.PLAYER);
  const bookingA = await createBooking(playerA.token, courtA);
  w = { admin, clubA, clubB, clubAdminA, clubAdminB, courtA, courtB, playerA, playerB, bookingA };
});

const idsOf = (response: { body: { items: { id: string }[] } }) => response.body.items.map((item) => item.id);

describe("bookings", () => {
  it("lets player B neither read, edit nor cancel player A's booking", async () => {
    await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerB.token)).expect(403);
    await api()
      .patch(`/bookings/${w.bookingA}`)
      .set(bearer(w.playerB.token))
      .send({ startsAt: "2026-11-01T14:00:00Z", endsAt: "2026-11-01T15:00:00Z" })
      .expect(403);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.playerB.token)).expect(403);

    // Still there, unchanged.
    const booking = await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerA.token)).expect(200);
    expect(booking.body.startsAt).toBe("2026-11-01T10:00:00.000Z");
  });

  it("lets the owner, the court's club admin and an ADMIN manage it", async () => {
    const move = (token: string, hour: number) =>
      api()
        .patch(`/bookings/${w.bookingA}`)
        .set(bearer(token))
        .send({
          startsAt: `2026-11-01T${hour}:00:00Z`.replace(/T(\d):/, "T0$1:"),
          endsAt: `2026-11-01T${hour + 2}:00:00Z`.replace(/T(\d):/, "T0$1:"),
        });
    await move(w.playerA.token, 11).expect(200);
    await move(w.clubAdminA.token, 9).expect(200);
    await move(w.admin.token, 8).expect(200);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminA.token)).expect(204);
  });

  it("keeps another club's admin out", async () => {
    await api().get(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminB.token)).expect(403);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminB.token)).expect(403);
  });

  it("books as the logged-in player and prices it from the court", async () => {
    const id = await createBooking(w.playerB.token, w.courtA, {
      startsAt: "2026-11-02T08:00:00Z",
      endsAt: "2026-11-02T11:00:00Z",
    });
    const booking = await api().get(`/bookings/${id}`).set(bearer(w.playerB.token)).expect(200);
    expect(booking.body.totalPrice).toEqual({ amountMinor: 300000, currency: "RSD" });
    expect(booking.body.player.id).toBe(w.playerB.id);
    expect(booking.body.club.name).toBe("Club A");
    expect(booking.body.court.id).toBe(w.courtA);
  });

  it("ignores a player or price sent by the client", async () => {
    const response = await api().post("/bookings").set(bearer(w.playerB.token)).send({
      courtId: w.courtA,
      startsAt: "2026-11-02T08:00:00Z",
      endsAt: "2026-11-02T10:00:00Z",
      bookingType: "ONE_TIME",
      playerId: w.playerA.id,
      totalPrice: 1,
    });
    expect(response.status).toBe(201);
    expect(response.body.player.id).toBe(w.playerB.id);
    expect(response.body.totalPrice.amountMinor).toBe(200000);
    const theirs = await api().get("/bookings").set(bearer(w.playerA.token)).expect(200);
    expect(theirs.body.items).toHaveLength(1);
  });

  it("does not let a price be edited, only recalculated", async () => {
    await api()
      .patch(`/bookings/${w.bookingA}`)
      .set(bearer(w.playerA.token))
      .send({ endsAt: "2026-11-01T14:00:00Z", totalPrice: 1 })
      .expect(200);
    const booking = await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerA.token)).expect(200);
    expect(booking.body.totalPrice.amountMinor).toBe(400000);
  });

  it("lists only what the caller may see", async () => {
    const other = await createBooking(w.playerB.token, w.courtB);

    expect(idsOf(await api().get("/bookings").set(bearer(w.playerA.token)).expect(200))).toEqual([w.bookingA]);
    expect(idsOf(await api().get("/bookings").set(bearer(w.clubAdminA.token)).expect(200))).toEqual([w.bookingA]);
    expect(idsOf(await api().get("/bookings").set(bearer(w.admin.token)).expect(200)).sort()).toEqual(
      [w.bookingA, other].sort()
    );

    await api().get(`/bookings?playerId=${w.playerA.id}`).set(bearer(w.playerB.token)).expect(403);
  });

  it("filters by court and by time", async () => {
    const later = await createBooking(w.playerA.token, w.courtA, {
      startsAt: "2026-11-05T10:00:00Z",
      endsAt: "2026-11-05T11:00:00Z",
    });
    const asA = (query: string) => api().get(`/bookings?${query}`).set(bearer(w.playerA.token)).expect(200);

    expect(idsOf(await asA(`courtId=${w.courtA}`)).sort()).toEqual([w.bookingA, later].sort());
    expect(idsOf(await asA("from=2026-11-03T00:00:00Z"))).toEqual([later]);
    expect(idsOf(await asA("to=2026-11-03T00:00:00Z"))).toEqual([w.bookingA]);
  });

  it("pages the list with a cursor", async () => {
    await createBooking(w.playerA.token, w.courtA, {
      startsAt: "2026-11-05T10:00:00Z",
      endsAt: "2026-11-05T11:00:00Z",
    });
    await createBooking(w.playerA.token, w.courtA, {
      startsAt: "2026-11-06T10:00:00Z",
      endsAt: "2026-11-06T11:00:00Z",
    });

    const first = await api().get("/bookings?limit=2").set(bearer(w.playerA.token)).expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(typeof first.body.nextCursor).toBe("string");
    const second = await api()
      .get(`/bookings?limit=2&cursor=${first.body.nextCursor}`)
      .set(bearer(w.playerA.token))
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
    expect(new Set([...idsOf(first), ...idsOf(second)]).size).toBe(3);
  });

  it("pages a club admin's list too", async () => {
    await createBooking(w.playerB.token, w.courtA, {
      startsAt: "2026-11-05T10:00:00Z",
      endsAt: "2026-11-05T11:00:00Z",
    });
    await createBooking(w.playerB.token, w.courtB, {
      startsAt: "2026-11-06T10:00:00Z",
      endsAt: "2026-11-06T11:00:00Z",
    });
    const first = await api().get("/bookings?limit=1").set(bearer(w.clubAdminA.token)).expect(200);
    expect(first.body.items).toHaveLength(1);
    const second = await api()
      .get(`/bookings?limit=1&cursor=${first.body.nextCursor}`)
      .set(bearer(w.clubAdminA.token))
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
  });

  it("books courts without a club, which have no club and may be free", async () => {
    const park = await createLooseCourt(w.playerA.token);
    const id = await createBooking(w.playerB.token, park);
    const booking = await api().get(`/bookings/${id}`).set(bearer(w.playerB.token)).expect(200);
    expect(booking.body.club).toBeNull();
    expect(booking.body.court.clubId).toBeNull();
    expect(booking.body.totalPrice).toBeNull();
  });
});

describe("clubs", () => {
  it("lets only an ADMIN create a club", async () => {
    const body = { name: "New", address: "x", description: "", city: "Nis", country: "Serbia" };
    await api().post("/clubs").set(bearer(w.playerA.token)).send(body).expect(403);
    await api().post("/clubs").set(bearer(w.clubAdminA.token)).send(body).expect(403);
    const created = await api().post("/clubs").set(bearer(w.admin.token)).send(body).expect(201);
    expect(created.body.currency).toBe("RSD");
    expect(created.body.courtCount).toBe(0);
  });

  it("lets a club set its own currency", async () => {
    const body = { name: "Euro club", address: "x", description: "", city: "Nis", country: "Serbia", currency: "EUR" };
    const club = (await api().post("/clubs").set(bearer(w.admin.token)).send(body).expect(201)).body.id;
    const court = await createCourt(w.admin.token, club, { pricePerHourMinor: 2000 });
    const booking = await createBooking(w.playerA.token, court);
    const response = await api().get(`/bookings/${booking}`).set(bearer(w.playerA.token)).expect(200);
    expect(response.body.totalPrice).toEqual({ amountMinor: 4000, currency: "EUR" });
  });

  it("keeps a club admin out of another club", async () => {
    await api().patch(`/clubs/${w.clubA}`).set(bearer(w.clubAdminB.token)).send({ name: "Hijacked" }).expect(403);
    await api().delete(`/clubs/${w.clubA}`).set(bearer(w.clubAdminB.token)).expect(403);
    await api().patch(`/clubs/${w.clubA}`).set(bearer(w.playerA.token)).send({ name: "Hijacked" }).expect(403);

    await api().patch(`/clubs/${w.clubA}`).set(bearer(w.clubAdminA.token)).send({ name: "Renamed" }).expect(200);
    const club = await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token)).expect(200);
    expect(club.body.name).toBe("Renamed");
    expect(club.body.admins).toBeUndefined();
  });

  it("moves a club's courts with it when its city changes", async () => {
    await api().patch(`/clubs/${w.clubA}`).set(bearer(w.clubAdminA.token)).send({ city: "Novi Sad" }).expect(200);
    const found = await api().get("/courts?city=Novi%20Sad").set(bearer(w.playerA.token)).expect(200);
    expect(idsOf(found)).toEqual([w.courtA]);
    expect(found.body.items[0].city).toBe("Novi Sad");
  });
});

describe("club courts", () => {
  it("keeps a club admin from changing another club's court", async () => {
    await api().patch(`/courts/${w.courtA}`).set(bearer(w.clubAdminB.token)).send({ name: "Mine now" }).expect(403);
    await api().delete(`/courts/${w.courtA}`).set(bearer(w.clubAdminB.token)).expect(403);
    await api().patch(`/courts/${w.courtA}`).set(bearer(w.playerA.token)).send({ name: "Mine now" }).expect(403);

    await api()
      .patch(`/courts/${w.courtA}`)
      .set(bearer(w.clubAdminA.token))
      .send({ pricePerHourMinor: 150000 })
      .expect(200);
    const court = await api().get(`/courts/${w.courtA}`).set(bearer(w.playerA.token)).expect(200);
    expect(court.body.pricePerHour).toEqual({ amountMinor: 150000, currency: "RSD" });
    expect(court.body.kind).toBe("CLUB");
    expect(court.body.ownerId).toBeNull();
  });

  it("lets a club admin create courts only in their own club", async () => {
    const body = { name: "C", surface: "HARD", pricePerHourMinor: 90000 };
    await api().post(`/clubs/${w.clubB}/courts`).set(bearer(w.clubAdminA.token)).send(body).expect(403);
    await api().post(`/clubs/${w.clubA}/courts`).set(bearer(w.playerA.token)).send(body).expect(403);
    await api().post(`/clubs/${w.clubA}/courts`).set(bearer(w.clubAdminA.token)).send(body).expect(201);
    await api().post(`/clubs/${w.clubA}/courts`).set(bearer(w.admin.token)).send(body).expect(201);
    await api().post("/clubs/missing/courts").set(bearer(w.admin.token)).send(body).expect(404);

    const club = await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token)).expect(200);
    expect(club.body.courtCount).toBe(3);
  });

  it("takes a club court's place and currency from the club", async () => {
    await api().patch(`/courts/${w.courtA}`).set(bearer(w.clubAdminA.token)).send({ city: "Nis" }).expect(400);
  });
});

describe("courts without a club", () => {
  it("lets any player add one and become its owner", async () => {
    const id = await createLooseCourt(w.playerA.token);
    const court = await api().get(`/courts/${id}`).set(bearer(w.playerB.token)).expect(200);
    expect(court.body.kind).toBe("PUBLIC");
    expect(court.body.club).toBeNull();
    expect(court.body.ownerId).toBe(w.playerA.id);
    expect(court.body.pricePerHour).toBeNull();
    expect(court.body.city).toBe("Belgrade");

    const loose = await api().get("/courts/unassigned").set(bearer(w.playerB.token)).expect(200);
    expect(idsOf(loose)).toEqual([id]);
    const publicOnes = await api().get("/courts?kind=PUBLIC").set(bearer(w.playerB.token)).expect(200);
    expect(idsOf(publicOnes)).toEqual([id]);
    const clubOnes = await api().get("/courts?kind=CLUB").set(bearer(w.playerB.token)).expect(200);
    expect(idsOf(clubOnes).sort()).toEqual([w.courtA, w.courtB].sort());
  });

  it("lets only the owner or an ADMIN change or delete it", async () => {
    const id = await createLooseCourt(w.playerA.token, { kind: "PRIVATE", pricePerHourMinor: 50000 });
    await api().patch(`/courts/${id}`).set(bearer(w.playerB.token)).send({ name: "Mine" }).expect(403);
    await api().patch(`/courts/${id}`).set(bearer(w.clubAdminA.token)).send({ name: "Mine" }).expect(403);
    await api().delete(`/courts/${id}`).set(bearer(w.playerB.token)).expect(403);

    await api().patch(`/courts/${id}`).set(bearer(w.playerA.token)).send({ name: "Renamed", city: "Nis" }).expect(200);
    await api().patch(`/courts/${id}`).set(bearer(w.admin.token)).send({ pricePerHourMinor: 0 }).expect(200);
    await api().delete(`/courts/${id}`).set(bearer(w.playerA.token)).expect(204);
  });

  it("lets the owner hand it over to a club, which then manages it", async () => {
    const id = await createLooseCourt(w.playerA.token);
    await api().post(`/courts/${id}/assign`).set(bearer(w.playerB.token)).send({ clubId: w.clubA }).expect(403);
    await api().post(`/courts/${id}/assign`).set(bearer(w.playerA.token)).send({ clubId: "missing" }).expect(404);

    const assigned = await api()
      .post(`/courts/${id}/assign`)
      .set(bearer(w.playerA.token))
      .send({ clubId: w.clubA })
      .expect(200);
    expect(assigned.body.kind).toBe("CLUB");
    expect(assigned.body.club.id).toBe(w.clubA);
    expect(assigned.body.ownerId).toBeNull();

    await api().patch(`/courts/${id}`).set(bearer(w.playerA.token)).send({ name: "Still mine" }).expect(403);
    await api().patch(`/courts/${id}`).set(bearer(w.clubAdminA.token)).send({ name: "Club's" }).expect(200);
    await api().patch(`/courts/${id}`).set(bearer(w.clubAdminB.token)).send({ name: "Not yours" }).expect(403);

    expect((await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token))).body.courtCount).toBe(2);
    expect(idsOf(await api().get("/courts/unassigned").set(bearer(w.playerA.token)).expect(200))).toEqual([]);
  });

  it("does not let a club admin take someone else's court, or move a club court", async () => {
    const id = await createLooseCourt(w.playerA.token);
    await api().post(`/courts/${id}/assign`).set(bearer(w.clubAdminA.token)).send({ clubId: w.clubA }).expect(403);

    const moved = await api().post(`/courts/${w.courtA}/assign`).set(bearer(w.admin.token)).send({ clubId: w.clubB });
    expect(moved.status).toBe(409);
    expect(moved.body.error.code).toBe("CONFLICT");
  });

  it("lets an ADMIN assign any court", async () => {
    const id = await createLooseCourt(w.playerA.token);
    await api().post(`/courts/${id}/assign`).set(bearer(w.admin.token)).send({ clubId: w.clubB }).expect(200);
  });
});

describe("players", () => {
  it("lets players edit and delete only themselves", async () => {
    await api().patch(`/players/${w.playerA.id}`).set(bearer(w.playerB.token)).send({ city: "Nis" }).expect(403);
    await api().delete(`/players/${w.playerA.id}`).set(bearer(w.playerB.token)).expect(403);
    await api().patch(`/players/${w.playerA.id}`).set(bearer(w.playerA.token)).send({ city: "Nis" }).expect(200);
    await api().patch(`/players/${w.playerA.id}`).set(bearer(w.admin.token)).send({ city: "Novi Sad" }).expect(200);
  });

  it("cannot be promoted through the API", async () => {
    await api().patch(`/players/${w.playerA.id}`).set(bearer(w.playerA.token)).send({ role: "ADMIN" }).expect(200);
    await api()
      .post("/clubs")
      .set(bearer(w.playerA.token))
      .send({ name: "x", address: "x", city: "x", country: "x" })
      .expect(403);
  });

  it("shows an email only to its owner and to admins, and never a password", async () => {
    const asOther = await api().get(`/players/${w.playerA.id}`).set(bearer(w.playerB.token)).expect(200);
    expect(asOther.body.email).toBeUndefined();
    expect(asOther.body.password).toBeUndefined();

    const asSelf = await api().get(`/players/${w.playerA.id}`).set(bearer(w.playerA.token)).expect(200);
    expect(asSelf.body.email).toBe(w.playerA.email);
    const asAdmin = await api().get(`/players/${w.playerA.id}`).set(bearer(w.admin.token)).expect(200);
    expect(asAdmin.body.email).toBe(w.playerA.email);
    expect(asAdmin.body.password).toBeUndefined();
  });

  it("filters by city and level", async () => {
    const pro = await registerPlayer({ city: "Nis", level: "PRO" });
    await registerPlayer({ city: "Nis", level: "NEWBIE" });
    const response = await api().get("/players?city=Nis&level=PRO").set(bearer(w.playerA.token)).expect(200);
    expect(idsOf(response)).toEqual([pro.id]);
  });
});

describe("partner requests", () => {
  const createRequest = (token: string, booking: string, extra = {}) =>
    api()
      .post("/partner-requests")
      .set(bearer(token))
      .send({ bookingId: booking, playersNeeded: 1, ...extra });

  const storedRequest = async (id: string) =>
    JSON.parse((await RedisClient.execute("JSON.GET", `PartnerRequest:${id}`)) as string);

  it("only lets the booking's owner ask for a partner", async () => {
    await createRequest(w.playerB.token, w.bookingA).expect(403);
    const created = await createRequest(w.playerA.token, w.bookingA).expect(201);
    expect(created.body.createdBy.id).toBe(w.playerA.id);
    expect((await storedRequest(created.body.id)).playerId).toBe(w.playerA.id);
  });

  it("shows when and where the booking is", async () => {
    const created = await createRequest(w.playerA.token, w.bookingA).expect(201);
    const feed = await api().get("/partner-requests").set(bearer(w.playerB.token)).expect(200);
    expect(feed.body.items).toHaveLength(1);
    const item = feed.body.items[0];
    expect(item.id).toBe(created.body.id);
    expect(item.booking.startsAt).toBe("2026-11-01T10:00:00.000Z");
    expect(item.booking.endsAt).toBe("2026-11-01T12:00:00.000Z");
    expect(item.booking.court.name).toBe("Court 1");
    expect(item.booking.club.name).toBe("Club A");
    expect(item.status).toBe("OPEN");
    expect(item.playersNeeded).toBe(1);
    expect(item.joined).toEqual([]);
  });

  it("uses the logged-in player, not one named in the body", async () => {
    const created = await createRequest(w.playerA.token, w.bookingA, { playerId: w.playerB.id }).expect(201);
    expect((await storedRequest(created.body.id)).playerId).toBe(w.playerA.id);
  });

  it("blocks joining your own request and joins as the token's player", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA).expect(201)).body.id;
    await api().post(`/partner-requests/${request}/join`).set(bearer(w.playerA.token)).expect(403);

    const joined = await api().post(`/partner-requests/${request}/join`).set(bearer(w.playerB.token)).expect(200);
    expect(joined.body.joined.map((p: { id: string }) => p.id)).toEqual([w.playerB.id]);
    expect(joined.body.status).toBe("CLOSED");

    // Full now, so it moves from the open feed to the closed one.
    const third = await playerWithRole(Role.PLAYER);
    const late = await api().post(`/partner-requests/${request}/join`).set(bearer(third.token));
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("CONFLICT");
    expect((await api().get("/partner-requests").set(bearer(third.token)).expect(200)).body.items).toEqual([]);
    const closed = await api().get("/partner-requests?status=CLOSED").set(bearer(third.token)).expect(200);
    expect(idsOf(closed)).toEqual([request]);
  });

  it("does not count the same player twice", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA, { playersNeeded: 2 }).expect(201)).body.id;
    await api().post(`/partner-requests/${request}/join`).set(bearer(w.playerB.token)).expect(200);
    await api().post(`/partner-requests/${request}/join`).set(bearer(w.playerB.token)).expect(200);
    const stored = await storedRequest(request);
    expect(stored.joinedBy).toEqual([w.playerB.id]);
    expect(stored.active).toBe(true);
  });

  it("lets only the creator or an ADMIN edit or delete", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA).expect(201)).body.id;
    await api()
      .patch(`/partner-requests/${request}`)
      .set(bearer(w.playerB.token))
      .send({ playersNeeded: 3 })
      .expect(403);
    await api().delete(`/partner-requests/${request}`).set(bearer(w.playerB.token)).expect(403);
    await api()
      .patch(`/partner-requests/${request}`)
      .set(bearer(w.playerA.token))
      .send({ playersNeeded: 2 })
      .expect(200);
    await api().delete(`/partner-requests/${request}`).set(bearer(w.admin.token)).expect(204);
  });
});

describe("matches", () => {
  const matchBody = (teamA: string[], teamB: string[], courtId: string) => ({
    firstTeam: teamA,
    secondTeam: teamB,
    sets: [
      { firstTeam: 6, secondTeam: 4 },
      { firstTeam: 6, secondTeam: 3 },
    ],
    courtId,
    playedAt: "2026-11-01T10:00:00Z",
  });

  it("only lets a player record a match they played in", async () => {
    const third = await registerPlayer();
    await api()
      .post("/matches")
      .set(bearer(w.playerA.token))
      .send(matchBody([w.playerB.id], [third.id], w.courtA))
      .expect(403);
    const created = await api()
      .post("/matches")
      .set(bearer(w.playerA.token))
      .send(matchBody([w.playerA.id], [w.playerB.id], w.courtA))
      .expect(201);
    expect(created.body.sets).toEqual(matchBody([], [], "").sets);
    expect(created.body.firstTeam[0].id).toBe(w.playerA.id);
    expect(created.body.club.name).toBe("Club A");
    expect(created.body.playedAt).toBe("2026-11-01T10:00:00.000Z");
  });

  it("refuses a player on both teams, an unknown court and an unknown player", async () => {
    const send = (body: unknown) =>
      api()
        .post("/matches")
        .set(bearer(w.playerA.token))
        .send(body as object);
    await send(matchBody([w.playerA.id], [w.playerA.id], w.courtA)).expect(400);
    await send(matchBody([w.playerA.id], [w.playerB.id], "missing")).expect(404);
    await send(matchBody([w.playerA.id], ["missing"], w.courtA)).expect(404);
  });

  it("lets only the players in a match, or an ADMIN, change or remove it", async () => {
    const third = await registerPlayer();
    const match = (
      await api()
        .post("/matches")
        .set(bearer(w.playerA.token))
        .send(matchBody([w.playerA.id], [w.playerB.id], w.courtA))
        .expect(201)
    ).body.id;
    const sets = [{ firstTeam: 0, secondTeam: 6 }];
    await api().patch(`/matches/${match}`).set(bearer(third.accessToken)).send({ sets }).expect(403);
    await api().delete(`/matches/${match}`).set(bearer(third.accessToken)).expect(403);
    const updated = await api().patch(`/matches/${match}`).set(bearer(w.playerB.token)).send({ sets }).expect(200);
    expect(updated.body.sets).toEqual(sets);
    await api().delete(`/matches/${match}`).set(bearer(w.admin.token)).expect(204);
  });

  it("lists a player's matches", async () => {
    const match = (
      await api()
        .post("/matches")
        .set(bearer(w.playerA.token))
        .send(matchBody([w.playerA.id], [w.playerB.id], w.courtA))
        .expect(201)
    ).body.id;
    const third = await registerPlayer();
    await api()
      .post("/matches")
      .set(bearer(third.accessToken))
      .send(matchBody([third.id], [w.playerB.id], w.courtA))
      .expect(201);

    expect(
      idsOf(await api().get(`/matches?playerId=${w.playerA.id}`).set(bearer(w.playerA.token)).expect(200))
    ).toEqual([match]);
    expect(
      (await api().get(`/matches?playerId=${w.playerB.id}`).set(bearer(w.playerA.token)).expect(200)).body.items
    ).toHaveLength(2);
    expect((await api().get("/matches").set(bearer(w.playerA.token)).expect(200)).body.items).toHaveLength(2);
  });
});

describe("rackets", () => {
  const racket = {
    brand: "Wilson",
    model: "Pro Staff",
    year: 2020,
    weight: 315,
    level: "PROFESSIONAL",
    headSizeInch: 97,
    balance: 6,
    stringPattern: "16x19",
  };

  it("lets only an ADMIN create, edit and delete rackets", async () => {
    await api().post("/rackets").set(bearer(w.playerA.token)).send(racket).expect(403);
    const id = (await api().post("/rackets").set(bearer(w.admin.token)).send(racket).expect(201)).body.id;
    await api().patch(`/rackets/${id}`).set(bearer(w.playerA.token)).send({ year: 2021 }).expect(403);
    await api().delete(`/rackets/${id}`).set(bearer(w.playerA.token)).expect(403);
    const updated = await api().patch(`/rackets/${id}`).set(bearer(w.admin.token)).send({ year: 2021 }).expect(200);
    expect(updated.body.year).toBe(2021);
    expect(idsOf(await api().get("/rackets").set(bearer(w.playerA.token)).expect(200))).toEqual([id]);
    await api().delete(`/rackets/${id}`).set(bearer(w.admin.token)).expect(204);
  });

  it("adds a racket to a player's own list only", async () => {
    const id = (await api().post("/rackets").set(bearer(w.admin.token)).send(racket).expect(201)).body.id;
    const list = (player: Session) => api().get(`/players/${player.id}/rackets`).set(bearer(player.token)).expect(200);
    expect((await list(w.playerA)).body.items).toEqual([]);

    await api().put(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerB.token)).expect(403);
    await api().put(`/players/${w.playerA.id}/rackets/missing`).set(bearer(w.playerA.token)).expect(404);
    await api().put(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerA.token)).expect(204);
    // Adding it again changes nothing.
    await api().put(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerA.token)).expect(204);
    expect(idsOf(await list(w.playerA))).toEqual([id]);
    expect((await list(w.playerB)).body.items).toEqual([]);

    await api().delete(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerB.token)).expect(403);
    await api().delete(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerA.token)).expect(204);
    expect((await list(w.playerA)).body.items).toEqual([]);
  });

  it("leaves a racket out of a player's list once the catalog drops it", async () => {
    const id = (await api().post("/rackets").set(bearer(w.admin.token)).send(racket).expect(201)).body.id;
    await api().put(`/players/${w.playerA.id}/rackets/${id}`).set(bearer(w.playerA.token)).expect(204);
    await api().delete(`/rackets/${id}`).set(bearer(w.admin.token)).expect(204);
    const mine = await api().get(`/players/${w.playerA.id}/rackets`).set(bearer(w.playerA.token)).expect(200);
    expect(mine.body.items).toEqual([]);
  });
});

describe("every write route needs a login", () => {
  const routes: [string, string][] = [
    ["post", "/bookings"],
    ["patch", "/bookings/x"],
    ["delete", "/bookings/x"],
    ["post", "/clubs"],
    ["patch", "/clubs/x"],
    ["delete", "/clubs/x"],
    ["post", "/clubs/x/courts"],
    ["post", "/courts"],
    ["post", "/courts/x/assign"],
    ["patch", "/courts/x"],
    ["delete", "/courts/x"],
    ["post", "/matches"],
    ["patch", "/matches/x"],
    ["delete", "/matches/x"],
    ["patch", "/players/x"],
    ["delete", "/players/x"],
    ["put", "/players/x/rackets/y"],
    ["delete", "/players/x/rackets/y"],
    ["post", "/partner-requests"],
    ["post", "/partner-requests/x/join"],
    ["patch", "/partner-requests/x"],
    ["delete", "/partner-requests/x"],
    ["post", "/rackets"],
    ["patch", "/rackets/x"],
    ["delete", "/rackets/x"],
  ];

  it.each(routes)("%s %s answers 401 without a token", async (method, path) => {
    const client = api() as unknown as Record<string, (p: string) => import("supertest").Test>;
    const response = await client[method](path).send({});
    expect(response.status).toBe(401);
  });
});
