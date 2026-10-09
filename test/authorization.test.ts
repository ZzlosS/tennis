import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import RedisClient from "../src/services/redisClient";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  playerWithRole,
  registerPlayer,
  Session,
} from "./helpers";

// One small world: two clubs with their own admin, two players, one platform admin.
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

describe("bookings", () => {
  it("lets player B neither read, edit nor cancel player A's booking", async () => {
    await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerB.token)).expect(403);
    await api().patch(`/bookings/${w.bookingA}`).set(bearer(w.playerB.token)).send({ from: 14, to: 15 }).expect(403);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.playerB.token)).expect(403);

    // Still there, unchanged.
    const booking = await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerA.token)).expect(200);
    expect(booking.body.from).toBe(10);
  });

  it("lets the owner, the court's club admin and an ADMIN manage it", async () => {
    await api().patch(`/bookings/${w.bookingA}`).set(bearer(w.playerA.token)).send({ from: 11 }).expect(200);
    await api().patch(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminA.token)).send({ from: 9 }).expect(200);
    await api().patch(`/bookings/${w.bookingA}`).set(bearer(w.admin.token)).send({ from: 8 }).expect(200);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminA.token)).expect(200);
  });

  it("keeps another club's admin out", async () => {
    await api().get(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminB.token)).expect(403);
    await api().delete(`/bookings/${w.bookingA}`).set(bearer(w.clubAdminB.token)).expect(403);
  });

  it("books as the logged-in player and prices it from the court", async () => {
    const id = await createBooking(w.playerB.token, w.courtA, { from: 8, to: 11 });
    const booking = await api().get(`/bookings/${id}`).set(bearer(w.playerB.token)).expect(200);
    expect(booking.body.totalPrice).toBe(3000);
    expect(booking.body.playerLastName).toContain("Player");
  });

  it("ignores a player or price sent by the client", async () => {
    const response = await api().post("/bookings").set(bearer(w.playerB.token)).send({
      court: w.courtA,
      from: 8,
      to: 10,
      bookingType: "ONE_TIME",
      date: "2026-11-02",
      player: w.playerA.id,
      totalPrice: 1,
    });
    expect(response.status).toBe(200);
    const mine = await api().get("/bookings").set(bearer(w.playerB.token)).expect(200);
    expect(mine.body.map((b: { totalPrice: number }) => b.totalPrice)).toContain(2000);
    const theirs = await api().get("/bookings").set(bearer(w.playerA.token)).expect(200);
    expect(theirs.body).toHaveLength(1);
  });

  it("does not let a price be edited, only recalculated", async () => {
    await api()
      .patch(`/bookings/${w.bookingA}`)
      .set(bearer(w.playerA.token))
      .send({ to: 14, totalPrice: 1 })
      .expect(200);
    const booking = await api().get(`/bookings/${w.bookingA}`).set(bearer(w.playerA.token)).expect(200);
    expect(booking.body.totalPrice).toBe(4000);
  });

  it("lists only what the caller may see", async () => {
    const other = await createBooking(w.playerB.token, w.courtB);

    const asPlayerA = await api().get("/bookings").set(bearer(w.playerA.token)).expect(200);
    expect(asPlayerA.body.map((b: { entityId: string }) => b.entityId)).toEqual([w.bookingA]);

    const asClubAdminA = await api().get("/bookings").set(bearer(w.clubAdminA.token)).expect(200);
    expect(asClubAdminA.body.map((b: { entityId: string }) => b.entityId)).toEqual([w.bookingA]);

    const asAdmin = await api().get("/bookings").set(bearer(w.admin.token)).expect(200);
    expect(asAdmin.body.map((b: { entityId: string }) => b.entityId).sort()).toEqual([w.bookingA, other].sort());

    await api().get(`/bookings?player=${w.playerA.id}`).set(bearer(w.playerB.token)).expect(403);
  });
});

describe("clubs and courts", () => {
  it("lets only an ADMIN create a club", async () => {
    const body = { name: "New", address: "x", description: "", city: "Nis", country: "Serbia" };
    await api().post("/clubs").set(bearer(w.playerA.token)).send(body).expect(403);
    await api().post("/clubs").set(bearer(w.clubAdminA.token)).send(body).expect(403);
    await api().post("/clubs").set(bearer(w.admin.token)).send(body).expect(200);
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

  it("keeps a club admin from changing another club's court", async () => {
    await api().patch(`/courts/${w.courtA}`).set(bearer(w.clubAdminB.token)).send({ pricePerHour: 1 }).expect(403);
    await api().delete(`/courts/${w.courtA}`).set(bearer(w.clubAdminB.token)).expect(403);
    await api().patch(`/courts/${w.courtA}`).set(bearer(w.playerA.token)).send({ pricePerHour: 1 }).expect(403);

    await api().patch(`/courts/${w.courtA}`).set(bearer(w.clubAdminA.token)).send({ pricePerHour: 1500 }).expect(200);
    const court = await api().get(`/courts/${w.courtA}`).set(bearer(w.playerA.token)).expect(200);
    expect(court.body.pricePerHour).toBe(1500);
  });

  it("lets a club admin create courts only in their own club", async () => {
    const body = { name: "C", surface: "HARD", pricePerHour: 900 };
    await api()
      .post("/courts")
      .set(bearer(w.clubAdminA.token))
      .send({ ...body, clubId: w.clubB })
      .expect(403);
    await api().post("/courts").set(bearer(w.clubAdminA.token)).send(body).expect(403);
    await api()
      .post("/courts")
      .set(bearer(w.playerA.token))
      .send({ ...body, clubId: w.clubA })
      .expect(403);
    await api()
      .post("/courts")
      .set(bearer(w.clubAdminA.token))
      .send({ ...body, clubId: w.clubA })
      .expect(200);
    await api().post("/courts").set(bearer(w.admin.token)).send(body).expect(200);

    const club = await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token)).expect(200);
    expect(club.body.courtsNumber).toBe(2);
  });

  it("keeps the court count right when courts are assigned and deleted", async () => {
    const loose = await createCourt(w.admin.token);
    await api()
      .post("/courts/assign")
      .set(bearer(w.clubAdminB.token))
      .send({ courtEntityID: loose, clubEntityID: w.clubA })
      .expect(403);
    await api()
      .post("/courts/assign")
      .set(bearer(w.clubAdminA.token))
      .send({ courtEntityID: loose, clubEntityID: w.clubA })
      .expect(200);
    // Now in club A, so club B's admin cannot pull it over.
    await api()
      .post("/courts/assign")
      .set(bearer(w.clubAdminB.token))
      .send({ courtEntityID: loose, clubEntityID: w.clubB })
      .expect(403);

    expect((await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token))).body.courtsNumber).toBe(2);
    await api().delete(`/courts/${loose}`).set(bearer(w.clubAdminA.token)).expect(200);
    expect((await api().get(`/clubs/${w.clubA}`).set(bearer(w.playerA.token))).body.courtsNumber).toBe(1);
  });

  it("keeps unassigned courts for ADMINs", async () => {
    const loose = await createCourt(w.admin.token);
    await api().patch(`/courts/${loose}`).set(bearer(w.clubAdminA.token)).send({ pricePerHour: 1 }).expect(403);
    await api().delete(`/courts/${loose}`).set(bearer(w.clubAdminA.token)).expect(403);
    await api().patch(`/courts/${loose}`).set(bearer(w.admin.token)).send({ pricePerHour: 1 }).expect(200);
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
});

describe("partner requests", () => {
  const createRequest = (token: string, booking: string, extra = {}) =>
    api()
      .post("/requests")
      .set(bearer(token))
      .send({ bookingEntityID: booking, numberOfPlayersNeeded: 1, ...extra });

  const storedRequest = async (id: string) =>
    JSON.parse((await RedisClient.execute("JSON.GET", `EnemyRequest:${id}`)) as string);

  it("only lets the booking's owner ask for a partner", async () => {
    await createRequest(w.playerB.token, w.bookingA).expect(403);
    const id = (await createRequest(w.playerA.token, w.bookingA).expect(200)).text;
    expect((await storedRequest(id)).playerEntityID).toBe(w.playerA.id);
  });

  it("uses the logged-in player, not one named in the body", async () => {
    const id = (await createRequest(w.playerA.token, w.bookingA, { playerEntityID: w.playerB.id }).expect(200)).text;
    expect((await storedRequest(id)).playerEntityID).toBe(w.playerA.id);
  });

  it("blocks accepting your own request and accepts as the token's player", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA).expect(200)).text;
    await api().post("/requests/accept").set(bearer(w.playerA.token)).send({ requestEntityID: request }).expect(403);

    await api()
      .post("/requests/accept")
      .set(bearer(w.playerB.token))
      .send({ requestEntityID: request, playerEntityID: w.playerA.id })
      .expect(200);
    const stored = await storedRequest(request);
    expect(stored.acceptedBy).toEqual([w.playerB.id]);
    expect(stored.active).toBe(false);

    // Full now.
    const third = await playerWithRole(Role.PLAYER);
    const late = await api().post("/requests/accept").set(bearer(third.token)).send({ requestEntityID: request });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("CONFLICT");
  });

  it("does not count the same player twice", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA, { numberOfPlayersNeeded: 2 }).expect(200)).text;
    await api().post("/requests/accept").set(bearer(w.playerB.token)).send({ requestEntityID: request }).expect(200);
    await api().post("/requests/accept").set(bearer(w.playerB.token)).send({ requestEntityID: request }).expect(200);
    const stored = await storedRequest(request);
    expect(stored.acceptedBy).toEqual([w.playerB.id]);
    expect(stored.active).toBe(true);
  });

  it("lets only the creator or an ADMIN edit or delete", async () => {
    const request = (await createRequest(w.playerA.token, w.bookingA).expect(200)).text;
    await api()
      .patch(`/requests/${request}`)
      .set(bearer(w.playerB.token))
      .send({ numberOfPlayersNeeded: 3 })
      .expect(403);
    await api().delete(`/requests/${request}`).set(bearer(w.playerB.token)).expect(403);
    await api()
      .patch(`/requests/${request}`)
      .set(bearer(w.playerA.token))
      .send({ numberOfPlayersNeeded: 2 })
      .expect(200);
    await api().delete(`/requests/${request}`).set(bearer(w.admin.token)).expect(200);
  });
});

describe("matches", () => {
  const matchBody = (teamA: string, teamB: string, court: string) => ({
    firstTeam: teamA,
    secondTeam: teamB,
    result: "6-4,6-3",
    court,
    date: "2026-11-01",
  });

  it("only lets a player record a match they played in", async () => {
    const third = await registerPlayer();
    await api()
      .post("/matches")
      .set(bearer(w.playerA.token))
      .send(matchBody(w.playerB.id, third.id, w.courtA))
      .expect(403);
    await api()
      .post("/matches")
      .set(bearer(w.playerA.token))
      .send(matchBody(w.playerA.id, w.playerB.id, w.courtA))
      .expect(200);
  });

  it("lets only the players in a match, or an ADMIN, change or remove it", async () => {
    const third = await registerPlayer();
    const match = (
      await api()
        .post("/matches")
        .set(bearer(w.playerA.token))
        .send(matchBody(w.playerA.id, w.playerB.id, w.courtA))
        .expect(200)
    ).text;
    await api()
      .patch(`/matches/${match}`)
      .set(bearer(third.accessToken))
      .send({ result: ["0-6"] })
      .expect(403);
    await api().delete(`/matches/${match}`).set(bearer(third.accessToken)).expect(403);
    await api()
      .patch(`/matches/${match}`)
      .set(bearer(w.playerB.token))
      .send({ result: ["7-5"] })
      .expect(200);
    await api().delete(`/matches/${match}`).set(bearer(w.admin.token)).expect(200);
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
    const id = (await api().post("/rackets").set(bearer(w.admin.token)).send(racket).expect(200)).text;
    await api().patch(`/rackets/${id}`).set(bearer(w.playerA.token)).send({ year: 2021 }).expect(403);
    await api().delete(`/rackets/${id}`).set(bearer(w.playerA.token)).expect(403);
    await api().patch(`/rackets/${id}`).set(bearer(w.admin.token)).send({ year: 2021 }).expect(200);
  });

  it("adds a racket to the caller's own list only", async () => {
    const id = (await api().post("/rackets").set(bearer(w.admin.token)).send(racket).expect(200)).text;
    expect((await api().get("/rackets").set(bearer(w.playerA.token)).expect(200)).body).toEqual([]);

    await api()
      .post("/rackets/assign")
      .set(bearer(w.playerA.token))
      .send({ racketEid: id, playerEid: w.playerB.id })
      .expect(200);
    expect((await api().get("/rackets").set(bearer(w.playerA.token)).expect(200)).body).toHaveLength(1);
    expect((await api().get("/rackets").set(bearer(w.playerB.token)).expect(200)).body).toEqual([]);
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
    ["post", "/courts"],
    ["post", "/courts/assign"],
    ["patch", "/courts/x"],
    ["delete", "/courts/x"],
    ["post", "/matches"],
    ["patch", "/matches/x"],
    ["delete", "/matches/x"],
    ["patch", "/players/x"],
    ["delete", "/players/x"],
    ["post", "/requests"],
    ["post", "/requests/accept"],
    ["patch", "/requests/x"],
    ["delete", "/requests/x"],
    ["post", "/rackets"],
    ["post", "/rackets/assign"],
    ["patch", "/rackets/x"],
    ["delete", "/rackets/x"],
  ];

  it.each(routes)("%s %s answers 401 without a token", async (method, path) => {
    const client = api() as unknown as Record<string, (p: string) => import("supertest").Test>;
    const response = await client[method](path).send({});
    expect(response.status).toBe(401);
  });
});
