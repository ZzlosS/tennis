import { describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  createLooseCourt,
  playerWithRole,
  registerPlayer,
} from "./helpers";

const validRegister = {
  firstName: "Ana",
  lastName: "Jovic",
  email: "ana@example.com",
  password: "correct-horse-battery",
};

describe("validation errors", () => {
  it("lists every bad field with VALIDATION_FAILED", async () => {
    const response = await api().post("/auth/register").send({ email: "not-an-email", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(response.body.error.fields).sort()).toEqual(["email", "firstName", "lastName", "password"]);
  });

  it("refuses passwords that bcrypt would silently cut", async () => {
    const response = await api()
      .post("/auth/register")
      .send({ ...validRegister, password: "x".repeat(73) });
    expect(response.status).toBe(400);
    expect(response.body.error.fields.password).toBeDefined();
  });

  it("fills defaults for the optional sign-up fields", async () => {
    const response = await api().post("/auth/register").send(validRegister).expect(201);
    expect(response.body.player.nickname).toBe("Ana");
    expect(response.body.player.level).toBe("NEWBIE");
  });

  it("drops keys it does not know", async () => {
    const player = await registerPlayer();
    await api()
      .patch(`/players/${player.id}`)
      .set(bearer(player.accessToken))
      .send({ city: "Nis", password: "hacked-password", email: "other@example.com" })
      .expect(200);
    await api().post("/auth/login").send({ email: player.email, password: player.password }).expect(200);
    const me = await api().get(`/players/${player.id}`).set(bearer(player.accessToken)).expect(200);
    expect(me.body.email).toBe(player.email);
    expect(me.body.city).toBe("Nis");
  });

  it("answers 401 before 400 when the caller is not logged in", async () => {
    await api().post("/bookings").send({}).expect(401);
  });
});

describe("bookings", () => {
  async function setup() {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const court = await createCourt(admin.token, club);
    const player = await registerPlayer();
    return { court, player };
  }

  it("checks times", async () => {
    const { court, player } = await setup();
    const book = (body: Record<string, unknown>) =>
      api()
        .post("/bookings")
        .set(bearer(player.accessToken))
        .send({
          courtId: court,
          startsAt: "2026-11-01T10:00:00Z",
          endsAt: "2026-11-01T12:00:00Z",
          bookingType: "ONE_TIME",
          ...body,
        });

    for (const bad of [
      { startsAt: "2026-11-01T12:00:00Z", endsAt: "2026-11-01T10:00:00Z" },
      { endsAt: "2026-11-01T10:00:00Z" },
      { endsAt: "2026-11-02T11:00:00Z" },
      { startsAt: "2026-11-01T10:30:00Z" },
      { startsAt: "2026-11-01T10:00:00+02:00" },
      { startsAt: "2026-11-01" },
      { startsAt: "tomorrow" },
      { bookingType: "WEEKLY" },
    ]) {
      const response = await book(bad);
      expect(response.status, JSON.stringify(bad)).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_FAILED");
    }
    await book({}).expect(201);
  });

  it("names the field that is wrong", async () => {
    const { court, player } = await setup();
    const response = await api()
      .post("/bookings")
      .set(bearer(player.accessToken))
      .send({
        courtId: court,
        startsAt: "2026-11-01T10:30:00Z",
        endsAt: "2026-11-01T12:00:00Z",
        bookingType: "ONE_TIME",
      });
    expect(Object.keys(response.body.error.fields)).toEqual(["startsAt"]);
  });

  it("answers a body of the wrong type with VALIDATION_FAILED too", async () => {
    const { player } = await setup();
    const response = await api().post("/bookings").set(bearer(player.accessToken)).send({ courtId: 5 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.fields.courtId).toBeDefined();
  });

  it("answers an unknown court with 404", async () => {
    const player = await registerPlayer();
    const response = await api().post("/bookings").set(bearer(player.accessToken)).send({
      courtId: "does-not-exist",
      startsAt: "2026-11-01T10:00:00Z",
      endsAt: "2026-11-01T12:00:00Z",
      bookingType: "ONE_TIME",
    });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("refuses an update that leaves the end before the start", async () => {
    const { court, player } = await setup();
    const booking = await createBooking(player.accessToken, court);
    const response = await api()
      .patch(`/bookings/${booking}`)
      .set(bearer(player.accessToken))
      .send({ startsAt: "2026-11-01T15:00:00Z" });
    expect(response.status).toBe(400);
    expect(response.body.error.fields.endsAt).toBeDefined();
  });
});

describe("other bodies", () => {
  it("checks clubs, courts, requests, rackets and matches", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const post = (path: string, body: Record<string, unknown>) => api().post(path).set(bearer(admin.token)).send(body);

    await post("/clubs", { name: "" }).expect(400);
    await post("/clubs", { name: "X", address: "a", city: "c", country: "s", currency: "rsd" }).expect(400);
    await post(`/clubs/${club}/courts`, { name: "C", surface: "ICE" }).expect(400);
    await post(`/clubs/${club}/courts`, { name: "C", surface: "HARD", pricePerHourMinor: -5 }).expect(400);
    await post(`/clubs/${club}/courts`, { name: "C", surface: "HARD", pricePerHourMinor: 10.5 }).expect(400);
    await post("/courts", { name: "C", surface: "HARD", kind: "CLUB", address: "a", city: "c", country: "s" }).expect(
      400
    );
    await post("/partner-requests", { bookingId: "x", playersNeeded: 0 }).expect(400);
    await post("/partner-requests", { bookingId: "x", playersNeeded: 4 }).expect(400);
    await post("/rackets", { brand: "Wilson", level: "SUPER" }).expect(400);
    await post("/matches", { firstTeam: ["a"] }).expect(400);
  });

  it("checks match scores", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const court = await createCourt(admin.token, club);
    const a = await registerPlayer();
    const b = await registerPlayer();
    const match = (sets: unknown) =>
      api()
        .post("/matches")
        .set(bearer(a.accessToken))
        .send({ firstTeam: [a.id], secondTeam: [b.id], sets, courtId: court, playedAt: "2026-11-01T10:00:00Z" });

    const set = { firstTeam: 6, secondTeam: 4 };
    await match([]).expect(400);
    await match(Array(7).fill(set)).expect(400);
    await match([{ firstTeam: -1, secondTeam: 6 }]).expect(400);
    await match([{ firstTeam: 6.5, secondTeam: 4 }]).expect(400);
    await match([set, set]).expect(201);
  });

  it("answers a bad query value with VALIDATION_FAILED", async () => {
    const player = await registerPlayer();
    for (const query of ["limit=0", "limit=101", "limit=abc", "cursor=nonsense", "level=GOD"]) {
      const response = await api().get(`/players?${query}`).set(bearer(player.accessToken));
      expect(response.status, query).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("filters courts by price in minor units", async () => {
    const player = await registerPlayer();
    await api().get("/courts?minPrice=abc").set(bearer(player.accessToken)).expect(400);

    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    await createCourt(admin.token, club, { pricePerHourMinor: 80000 });
    await createCourt(admin.token, club, { pricePerHourMinor: 300000 });
    await createLooseCourt(player.accessToken);
    const response = await api()
      .get("/courts?minPrice=50000&maxPrice=100000")
      .set(bearer(player.accessToken))
      .expect(200);
    expect(
      response.body.items.map((c: { pricePerHour: { amountMinor: number } }) => c.pricePerHour.amountMinor)
    ).toEqual([80000]);
  });
});
