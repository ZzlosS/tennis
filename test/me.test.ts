import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  createLooseCourt,
  login,
  playerWithRole,
  registerPlayer,
  Session,
} from "./helpers";

let admin: Session;
let clubId: string;
let courtId: string;

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  clubId = await createClub(admin.token);
  courtId = await createCourt(admin.token, clubId);
});

describe("the profile", () => {
  it("shows the email and role, and takes changes", async () => {
    const player = await registerPlayer();
    const me = await api().get("/me").set(bearer(player.accessToken)).expect(200);
    expect(me.body).toMatchObject({ id: player.id, email: player.email, role: "PLAYER" });

    const changed = await api()
      .patch("/me")
      .set(bearer(player.accessToken))
      .send({ firstName: "Novi", nickname: "novi" })
      .expect(200);
    expect(changed.body).toMatchObject({ firstName: "Novi", nickname: "novi", email: player.email });
    expect((await api().get("/me").set(bearer(player.accessToken)).expect(200)).body.firstName).toBe("Novi");
  });

  it("needs a login", async () => {
    await api().get("/me").expect(401);
  });
});

describe("changing the password", () => {
  it("refuses a wrong current password", async () => {
    const player = await registerPlayer();
    const response = await api()
      .post("/me/password")
      .set(bearer(player.accessToken))
      .send({ currentPassword: "nope-nope-nope", newPassword: "another-long-one" })
      .expect(403);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("ends the other sessions, keeps this one, and switches the login to the new password", async () => {
    const player = await registerPlayer();
    const changed = await api()
      .post("/me/password")
      .set(bearer(player.accessToken))
      .send({ currentPassword: player.password, newPassword: "another-long-one" })
      .expect(200);

    await api().post("/auth/refresh").send({ refreshToken: player.refreshToken }).expect(401);
    await api().post("/auth/refresh").send({ refreshToken: changed.body.refreshToken }).expect(200);
    await api().post("/auth/login").send({ email: player.email, password: player.password }).expect(401);
    await login(player.email, "another-long-one");
  });
});

describe("deleting the account", () => {
  it("needs the password", async () => {
    const player = await registerPlayer();
    const response = await api()
      .delete("/me")
      .set(bearer(player.accessToken))
      .send({ password: "wrong-wrong-wrong" })
      .expect(403);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("cancels future bookings, closes own courts, ends logins and frees the email", async () => {
    const player = await registerPlayer();
    const bookingId = await createBooking(player.accessToken, courtId);
    const looseId = await createLooseCourt(player.accessToken);

    await api().delete("/me").set(bearer(player.accessToken)).send({ password: player.password }).expect(204);

    const booking = await api().get(`/bookings/${bookingId}`).set(bearer(admin.token)).expect(200);
    expect(booking.body.status).toBe("CANCELLED");
    const court = await api().get(`/courts/${looseId}`).set(bearer(admin.token)).expect(200);
    expect(court.body.active).toBe(false);

    await api().post("/auth/refresh").send({ refreshToken: player.refreshToken }).expect(401);
    await api().post("/auth/login").send({ email: player.email, password: player.password }).expect(401);
    await registerPlayer({ email: player.email });
  });
});

describe("what I own", () => {
  it("lists my own courts and clubs only", async () => {
    const player = await registerPlayer();
    const other = await registerPlayer();
    const mine = await createLooseCourt(player.accessToken);
    await createLooseCourt(other.accessToken);
    const courts = await api().get("/me/courts").set(bearer(player.accessToken)).expect(200);
    expect(courts.body.items.map((c: { id: string }) => c.id)).toEqual([mine]);

    expect((await api().get("/me/clubs").set(bearer(player.accessToken)).expect(200)).body.items).toEqual([]);
    const clubAdmin = await playerWithRole(Role.CLUB_ADMIN, clubId);
    const clubs = await api().get("/me/clubs").set(bearer(clubAdmin.token)).expect(200);
    expect(clubs.body.items.map((c: { id: string }) => c.id)).toEqual([clubId]);
  });
});

describe("my bookings", () => {
  it("splits upcoming and past around now, newest or soonest first, and hides others and cancelled ones", async () => {
    const player = await registerPlayer();
    const other = await registerPlayer();
    // The clock stands at 9 October 2026 08:00 UTC; these are all in the future, so book then compare lists.
    const later = await createBooking(player.accessToken, courtId, {
      startsAt: "2026-11-03T10:00:00Z",
      endsAt: "2026-11-03T11:00:00Z",
    });
    const sooner = await createBooking(player.accessToken, courtId, {
      startsAt: "2026-10-12T10:00:00Z",
      endsAt: "2026-10-12T11:00:00Z",
    });
    const cancelled = await createBooking(player.accessToken, courtId, {
      startsAt: "2026-11-10T10:00:00Z",
      endsAt: "2026-11-10T11:00:00Z",
    });
    await api().post(`/bookings/${cancelled}/cancel`).set(bearer(admin.token)).expect(200);
    await createBooking(other.accessToken, courtId, {
      startsAt: "2026-11-04T10:00:00Z",
      endsAt: "2026-11-04T11:00:00Z",
    });

    const upcoming = await api().get("/me/bookings").set(bearer(player.accessToken)).expect(200);
    expect(upcoming.body.items.map((b: { id: string }) => b.id)).toEqual([sooner, later]);
    const past = await api().get("/me/bookings?when=past").set(bearer(player.accessToken)).expect(200);
    expect(past.body.items).toEqual([]);
  });
});
