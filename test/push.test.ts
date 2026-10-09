import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { setClock } from "../src/services/clock";
import { FakePushClient, setPushClient } from "../src/services/pushClient";
import ReminderService from "../src/services/reminderService";
import {
  api,
  bearer,
  createBooking,
  createClub,
  createCourt,
  playerWithRole,
  registerPlayer,
  Session,
  TestPlayer,
} from "./helpers";

let push: FakePushClient;
let admin: Session;
let clubId: string;
let courtId: string;
let alice: TestPlayer;
let bob: TestPlayer;

const phone = (n: number) => `ExponentPushToken[phone-${n}]`;
const register = (p: TestPlayer, token: string) => api().post("/me/devices").set(bearer(p.accessToken)).send({ token });

beforeEach(async () => {
  push = new FakePushClient();
  setPushClient(push);
  admin = await playerWithRole(Role.ADMIN);
  clubId = await createClub(admin.token, { name: "TK Banjica" });
  courtId = await createCourt(admin.token, clubId, { name: "Court 1" });
  alice = await registerPlayer({ nickname: "alice" });
  bob = await registerPlayer({ nickname: "bob" });
  await register(alice, phone(1)).expect(204);
  await register(bob, phone(2)).expect(204);
});
afterEach(() => setPushClient(null));

const to = (token: string) => push.sent.filter((message) => message.to === token);

describe("phones", () => {
  it("only takes Expo push tokens", async () => {
    await register(alice, "not-a-token").expect(400);
  });

  it("moves a phone to whoever signs in on it, and forgets it on removal", async () => {
    await register(bob, phone(1)).expect(204);
    const booking = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${booking}/cancel`).set(bearer(admin.token)).expect(200);
    expect(to(phone(1))).toHaveLength(0);

    await api()
      .delete("/me/devices")
      .set(bearer(bob.accessToken))
      .send({ token: phone(2) })
      .expect(204);
    await api()
      .delete("/me/devices")
      .set(bearer(bob.accessToken))
      .send({ token: phone(1) })
      .expect(204);
    const other = await createBooking(bob.accessToken, courtId, {
      startsAt: "2026-11-02T10:00:00Z",
      endsAt: "2026-11-02T11:00:00Z",
    });
    await api().post(`/bookings/${other}/cancel`).set(bearer(admin.token)).expect(200);
    expect(push.sent).toEqual([]);
  });

  it("forgets a phone that Expo says is gone", async () => {
    push.gone.add(phone(1));
    const booking = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${booking}/cancel`).set(bearer(admin.token)).expect(200);
    expect(to(phone(1))).toHaveLength(1);

    const again = await createBooking(alice.accessToken, courtId, {
      startsAt: "2026-11-02T10:00:00Z",
      endsAt: "2026-11-02T11:00:00Z",
    });
    await api().post(`/bookings/${again}/cancel`).set(bearer(admin.token)).expect(200);
    expect(to(phone(1))).toHaveLength(1);
  });

  it("stops after the account is deleted", async () => {
    await api().delete("/me").set(bearer(alice.accessToken)).send({ password: alice.password }).expect(204);
    const { devicesOf } = await import("../src/services/deviceService");
    expect(await devicesOf(alice.id)).toEqual([]);
  });
});

describe("reminders", () => {
  it("go out two hours before a booking, once, in the player's language", async () => {
    await api().patch("/me").set(bearer(alice.accessToken)).send({ language: "sr" }).expect(200);
    // 2 November 2026, 10:00 UTC = 11:00 in Belgrade.
    const booking = await createBooking(alice.accessToken, courtId, {
      startsAt: "2026-11-02T10:00:00Z",
      endsAt: "2026-11-02T11:00:00Z",
    });
    const reminders = new ReminderService();

    setClock("2026-11-02T07:59:00Z");
    expect(await reminders.runDue()).toBe(0);
    setClock("2026-11-02T08:01:00Z");
    expect(await reminders.runDue()).toBe(1);
    expect(await reminders.runDue()).toBe(0);

    expect(push.sent).toHaveLength(1);
    expect(push.sent[0]).toMatchObject({
      to: phone(1),
      title: "Uskoro igraš",
      data: { type: "BOOKING_REMINDER", bookingId: booking },
    });
    expect(push.sent[0].body).toContain("11:00");
    expect(push.sent[0].body).toContain("Court 1, TK Banjica");
  });

  it("follow a booking that moves, and stop when it is cancelled", async () => {
    const reminders = new ReminderService();
    const first = await createBooking(alice.accessToken, courtId, {
      startsAt: "2026-11-02T10:00:00Z",
      endsAt: "2026-11-02T11:00:00Z",
    });
    await api()
      .patch(`/bookings/${first}`)
      .set(bearer(alice.accessToken))
      .send({ startsAt: "2026-11-02T14:00:00Z", endsAt: "2026-11-02T15:00:00Z" })
      .expect(200);
    setClock("2026-11-02T08:30:00Z");
    expect(await reminders.runDue()).toBe(0);
    setClock("2026-11-02T12:30:00Z");
    expect(await reminders.runDue()).toBe(1);

    const second = await createBooking(bob.accessToken, courtId, {
      startsAt: "2026-11-03T10:00:00Z",
      endsAt: "2026-11-03T11:00:00Z",
    });
    await api().post(`/bookings/${second}/cancel`).set(bearer(admin.token)).expect(200);
    push.sent.length = 0;
    setClock("2026-11-03T09:00:00Z");
    expect(await reminders.runDue()).toBe(0);
    expect(to(phone(2)).map((m) => m.data.type)).toEqual([]);
  });

  it("are skipped for a booking that starts in less than two hours", async () => {
    setClock("2026-10-09T08:00:00Z");
    await createBooking(alice.accessToken, courtId, {
      startsAt: "2026-10-09T09:00:00Z",
      endsAt: "2026-10-09T10:00:00Z",
    });
    expect(await new ReminderService().runDue()).toBe(0);
  });
});

describe("other events", () => {
  it("tell the club's player when somebody else cancels, but not when they cancel themselves", async () => {
    const mine = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${mine}/cancel`).set(bearer(alice.accessToken)).expect(200);
    expect(push.sent).toEqual([]);

    const theirs = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${theirs}/cancel`).set(bearer(admin.token)).expect(200);
    expect(push.sent[0]).toMatchObject({
      to: phone(1),
      title: "Booking cancelled",
      data: { type: "BOOKING_CANCELLED" },
    });
  });

  it("tell a player that somebody joined their request", async () => {
    const booking = await createBooking(alice.accessToken, courtId);
    const request = (
      await api()
        .post("/partner-requests")
        .set(bearer(alice.accessToken))
        .send({ bookingId: booking, playersNeeded: 1 })
        .expect(201)
    ).body.id;
    await api().post(`/partner-requests/${request}/join`).set(bearer(bob.accessToken)).expect(200);
    expect(to(phone(1))[0]).toMatchObject({
      title: "Someone joined you",
      data: { type: "PARTNER_JOINED", requestId: request },
    });
    expect(to(phone(1))[0].body).toContain("bob");
  });

  it("ask the other team to confirm a match, and tell the player who entered it about the answer", async () => {
    const match = (
      await api()
        .post("/matches")
        .set(bearer(alice.accessToken))
        .send({
          firstTeam: [alice.id],
          secondTeam: [bob.id],
          sets: [
            { firstTeam: 6, secondTeam: 4 },
            { firstTeam: 6, secondTeam: 3 },
          ],
          courtId,
          playedAt: "2026-10-01T10:00:00Z",
        })
        .expect(201)
    ).body.id;
    expect(to(phone(2))[0]).toMatchObject({
      title: "Confirm the score",
      data: { type: "MATCH_TO_CONFIRM", matchId: match },
    });
    expect(to(phone(1))).toHaveLength(0);

    await api().post(`/matches/${match}/confirm`).set(bearer(bob.accessToken)).expect(200);
    expect(to(phone(1))[0]).toMatchObject({ title: "Score confirmed", data: { type: "MATCH_CONFIRMED" } });
  });

  it("ask a club's admins about a court handover and tell the owner the answer", async () => {
    const clubAdmin = await playerWithRole(Role.CLUB_ADMIN, clubId);
    await api()
      .post("/me/devices")
      .set(bearer(clubAdmin.token))
      .send({ token: phone(3) })
      .expect(204);
    const park = (
      await api()
        .post("/courts")
        .set(bearer(alice.accessToken))
        .send({
          name: "Park",
          surface: "HARD",
          stands: false,
          roof: false,
          double: false,
          kind: "PUBLIC",
          address: "Kalemegdan",
          city: "Belgrade",
          country: "Serbia",
        })
        .expect(201)
    ).body.id;
    const handover = (
      await api().post(`/courts/${park}/handover`).set(bearer(alice.accessToken)).send({ clubId }).expect(201)
    ).body.id;
    expect(to(phone(3))[0]).toMatchObject({ data: { type: "HANDOVER_REQUESTED", handoverId: handover } });

    await api().post(`/court-handovers/${handover}/decline`).set(bearer(clubAdmin.token)).expect(200);
    expect(to(phone(1))[0]).toMatchObject({ data: { type: "HANDOVER_ANSWERED" } });
    expect(to(phone(1))[0].body).toContain("declined");
  });

  it("never fail the request when Expo is down", async () => {
    setPushClient({
      send: async () => {
        throw new Error("Expo is down");
      },
    });
    const booking = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${booking}/cancel`).set(bearer(admin.token)).expect(200);
  });
});

describe("the Expo client", () => {
  it("posts batches with the access token and reads the tickets", async () => {
    const { ExpoPushClient } = await import("../src/services/pushClient");
    const calls: { body: unknown[]; auth: string | undefined }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as unknown[];
      calls.push({ body, auth: (init.headers as Record<string, string>).Authorization });
      return new Response(
        JSON.stringify({
          data: body.map((_m, i) =>
            i === 0 ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: "x" }
          ),
        }),
        { status: 200 }
      );
    }) as typeof fetch;
    try {
      const messages = Array.from({ length: 150 }, (_v, i) => ({ to: phone(i), title: "t", body: "b", data: {} }));
      const results = await new ExpoPushClient("secret").send(messages);
      expect(calls.map((c) => c.body.length)).toEqual([100, 50]);
      expect(calls[0].auth).toBe("Bearer secret");
      expect(results).toHaveLength(150);
      expect(results[0]).toMatchObject({ ok: false, deviceGone: true });
      expect(results[1]).toMatchObject({ ok: true, deviceGone: false });
    } finally {
      globalThis.fetch = original;
    }
  });
});
