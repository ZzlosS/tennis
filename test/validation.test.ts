import { describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { api, bearer, createBooking, createClub, createCourt, playerWithRole, registerPlayer } from "./helpers";

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
  it("checks hours and dates", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const court = await createCourt(admin.token);
    const player = await registerPlayer();
    const book = (body: Record<string, unknown>) =>
      api()
        .post("/bookings")
        .set(bearer(player.accessToken))
        .send({ court, from: 10, to: 12, bookingType: "ONE_TIME", date: "2026-11-01", ...body });

    for (const bad of [
      { from: 12, to: 10 },
      { from: 10, to: 10 },
      { to: 25 },
      { from: -1 },
      { from: 10.5 },
      { date: "tomorrow" },
      { bookingType: "WEEKLY" },
    ]) {
      const response = await book(bad);
      expect(response.status, JSON.stringify(bad)).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_FAILED");
    }
    await book({}).expect(200);
  });

  it("answers an unknown court with 404", async () => {
    const player = await registerPlayer();
    const response = await api()
      .post("/bookings")
      .set(bearer(player.accessToken))
      .send({ court: "does-not-exist", from: 10, to: 12, bookingType: "ONE_TIME", date: "2026-11-01" });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("refuses an update that leaves 'to' before 'from'", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const court = await createCourt(admin.token);
    const player = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);
    const response = await api().patch(`/bookings/${booking}`).set(bearer(player.accessToken)).send({ from: 15 });
    expect(response.status).toBe(400);
    expect(response.body.error.fields.to).toBeDefined();
  });
});

describe("other bodies", () => {
  it("checks clubs, courts, requests and rackets", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const post = (path: string, body: Record<string, unknown>) => api().post(path).set(bearer(admin.token)).send(body);

    await post("/clubs", { name: "" }).expect(400);
    await post("/courts", { name: "C", surface: "ICE", pricePerHour: 100 }).expect(400);
    await post("/courts", { name: "C", surface: "HARD", pricePerHour: -5 }).expect(400);
    await post("/requests", { bookingEntityID: "x", numberOfPlayersNeeded: 0 }).expect(400);
    await post("/requests", { bookingEntityID: "x", numberOfPlayersNeeded: 4 }).expect(400);
    await post("/rackets", { brand: "Wilson", level: "SUPER" }).expect(400);
    await post("/matches", { firstTeam: "a" }).expect(400);
  });

  it("needs numeric from and to for the price search", async () => {
    const player = await registerPlayer();
    await api().get("/courts/price").set(bearer(player.accessToken)).expect(400);
    await api().get("/courts/price?from=abc&to=5").set(bearer(player.accessToken)).expect(400);

    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    await createCourt(admin.token, club, { pricePerHour: 800 });
    await createCourt(admin.token, club, { pricePerHour: 3000 });
    const response = await api().get("/courts/price?from=500&to=1000").set(bearer(player.accessToken)).expect(200);
    expect(response.body.map((c: { pricePerHour: number }) => c.pricePerHour)).toEqual([800]);
  });
});
