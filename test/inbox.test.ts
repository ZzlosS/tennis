import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { setClock } from "../src/services/clock";
import { INBOX_SIZE } from "../src/services/inboxService";
import Notifier from "../src/services/notifier";
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

let admin: Session;
let courtId: string;
let alice: TestPlayer;

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
  courtId = await createCourt(admin.token, await createClub(admin.token, { name: "TK Banjica" }), { name: "Court 1" });
  alice = await registerPlayer({ nickname: "alice", language: "sr" });
});

const inbox = async (token: string) => (await api().get("/me/notifications").set(bearer(token)).expect(200)).body;
const unread = async (token: string) =>
  (await api().get("/me/notifications/unread").set(bearer(token)).expect(200)).body.count as number;

describe("the notification inbox", () => {
  it("keeps what was sent, in the player's language, even without a phone", async () => {
    const booking = await createBooking(alice.accessToken, courtId);
    await api().post(`/bookings/${booking}/cancel`).set(bearer(admin.token)).expect(200);

    const page = await inbox(alice.accessToken);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      type: "BOOKING_CANCELLED",
      title: "Rezervacija otkazana",
      data: { bookingId: booking },
      read: false,
    });
    expect(await unread(alice.accessToken)).toBe(1);
    expect(await inbox(admin.token)).toEqual({ items: [], nextCursor: null });
  });

  it("marks everything sent so far as read, and counts what comes after", async () => {
    const notifier = new Notifier();
    await notifier.notify([alice.id], "MATCH_CONFIRMED", { who: "bob" }, { matchId: "m1" });
    await notifier.notify([alice.id], "MATCH_DISPUTED", { who: "bob" }, { matchId: "m2" });
    expect(await unread(alice.accessToken)).toBe(2);

    setClock(new Date(Date.parse("2026-10-09T08:00:00Z") + 1000));
    await api().post("/me/notifications/read").set(bearer(alice.accessToken)).expect(204);
    expect(await unread(alice.accessToken)).toBe(0);

    setClock(new Date(Date.parse("2026-10-09T08:00:00Z") + 2000));
    await notifier.notify([alice.id], "MATCH_TO_CONFIRM", { who: "bob" }, { matchId: "m3" });
    const page = await inbox(alice.accessToken);
    expect(
      page.items.map((item: { data: { matchId: string }; read: boolean }) => [item.data.matchId, item.read])
    ).toEqual([
      ["m3", false],
      ["m2", true],
      ["m1", true],
    ]);
    expect(await unread(alice.accessToken)).toBe(1);
  });

  it("keeps only the newest ones, and pages through them", async () => {
    const notifier = new Notifier();
    for (let i = 0; i < INBOX_SIZE + 5; i++) {
      await notifier.notify([alice.id], "MATCH_CONFIRMED", { who: "bob" }, { matchId: `m${i}` });
    }
    const first = await api().get("/me/notifications?limit=40").set(bearer(alice.accessToken)).expect(200);
    expect(first.body.items[0].data.matchId).toBe(`m${INBOX_SIZE + 4}`);
    const second = await api()
      .get(`/me/notifications?limit=40&cursor=${first.body.nextCursor}`)
      .set(bearer(alice.accessToken))
      .expect(200);
    expect(first.body.items.length + second.body.items.length).toBe(INBOX_SIZE);
    expect(second.body.items.at(-1).data.matchId).toBe("m5");
    expect(second.body.nextCursor).toBeNull();
  });

  it("is gone with the account", async () => {
    await new Notifier().notify([alice.id], "MATCH_CONFIRMED", { who: "bob" }, { matchId: "m1" });
    await api().delete("/me").set(bearer(alice.accessToken)).send({ password: alice.password }).expect(204);
    const again = await registerPlayer({ email: alice.email });
    expect(await unread(again.accessToken)).toBe(0);
  });

  it("needs a login", async () => {
    await api().get("/me/notifications").expect(401);
    await api().post("/me/notifications/read").expect(401);
  });
});
