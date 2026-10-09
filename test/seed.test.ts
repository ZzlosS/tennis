import { describe, expect, it } from "vitest";
import { seed } from "../src/examples/insertData";
import { api, bearer, login } from "./helpers";

describe("the sample data", () => {
  it("gives a working app: logins, clubs on the map, bookings, partner requests and stats", async () => {
    await seed();
    const player = await login("player1@example.com", "password123");
    const admin = await login("admin@example.com", "password123");
    const clubAdmin = await login("clubadmin@example.com", "password123");
    const as = (s: { token: string }) => bearer(s.token);

    expect((await api().get("/me").set(as(admin)).expect(200)).body.role).toBe("ADMIN");
    const clubs = (await api().get("/clubs").set(as(player)).expect(200)).body.items;
    expect(clubs.map((c: { name: string }) => c.name).sort()).toEqual(["TK Banjica", "TK Dunav"]);
    expect((await api().get("/me/clubs").set(as(clubAdmin)).expect(200)).body.items).toHaveLength(1);

    const map = (await api().get("/places?lat=44.8125&lng=20.4612&radiusKm=200").set(as(player)).expect(200)).body
      .items;
    expect(map.map((p: { kind: string }) => p.kind).sort()).toEqual(["CLUB", "CLUB", "PRIVATE", "PUBLIC"]);

    const mine = (await api().get("/me/bookings").set(as(player)).expect(200)).body.items;
    expect(mine).toHaveLength(1);
    const requests = (await api().get("/partner-requests").set(as(player)).expect(200)).body.items;
    expect(requests).toHaveLength(2);

    const stats = (await api().get("/me/stats").set(as(player)).expect(200)).body;
    expect(stats).toMatchObject({ matches: 2, wins: 2, losses: 0 });
    const toConfirm = (await api().get("/me/matches?status=PENDING").set(as(player)).expect(200)).body.items;
    expect(toConfirm).toEqual([]);

    const day = await api()
      .get(`/clubs/${clubs.find((c: { name: string }) => c.name === "TK Banjica").id}/schedule?date=2026-10-14`)
      .set(as(clubAdmin))
      .expect(200);
    expect(day.body.courts).toHaveLength(3);
    const handovers = (await api().get("/me/court-handovers").set(as(clubAdmin)).expect(200)).body.items;
    expect(handovers).toHaveLength(1);
  });

  it("does nothing the second time", async () => {
    await seed();
    await seed();
    const admin = await login("admin@example.com", "password123");
    expect((await api().get("/clubs").set(bearer(admin.token)).expect(200)).body.items).toHaveLength(2);
  });
});
