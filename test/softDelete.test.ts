import { describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { api, bearer, createBooking, createClub, createCourt, playerWithRole, registerPlayer } from "./helpers";

describe("soft delete", () => {
  it("hides a deleted club from lists and answers 404 by id", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const keep = await createClub(admin.token, { name: "Keep", city: "Belgrade" });
    const gone = await createClub(admin.token, { name: "Gone", city: "Belgrade" });
    await api().delete(`/clubs/${gone}`).set(bearer(admin.token)).expect(200);

    const byCity = await api().get("/clubs/city/Belgrade").set(bearer(admin.token)).expect(200);
    expect(byCity.body.map((c: { entityId: string }) => c.entityId)).toEqual([keep]);
    const all = await api().get("/clubs/all").set(bearer(admin.token)).expect(200);
    expect(all.body.map((c: { entityId: string }) => c.entityId)).toEqual([keep]);
    const byId = await api().get(`/clubs/${gone}`).set(bearer(admin.token));
    expect(byId.status).toBe(404);
    expect(byId.body.error.code).toBe("NOT_FOUND");
  });

  it("hides a deleted court from the club, the lists and the price search", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const keep = await createCourt(admin.token, club, { pricePerHour: 900 });
    const gone = await createCourt(admin.token, club, { pricePerHour: 950 });
    await api().delete(`/courts/${gone}`).set(bearer(admin.token)).expect(200);

    const clubBody = (await api().get(`/clubs/${club}`).set(bearer(admin.token)).expect(200)).body;
    expect(clubBody.courtsNumber).toBe(1);
    expect(clubBody.courts).toHaveLength(1);
    const all = await api().get("/courts/all").set(bearer(admin.token)).expect(200);
    expect(all.body.map((c: { entityId: string }) => c.entityId)).toEqual([keep]);
    const cheap = await api().get("/courts/price?from=0&to=2000").set(bearer(admin.token)).expect(200);
    expect(cheap.body.map((c: { entityId: string }) => c.entityId)).toEqual([keep]);
    await api().get(`/courts/${gone}`).set(bearer(admin.token)).expect(404);
  });

  it("hides a deleted booking", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const court = await createCourt(admin.token);
    const player = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);
    await api().delete(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(200);

    await api().get(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(404);
    await api().delete(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(404);
    const list = await api().get("/bookings").set(bearer(player.accessToken)).expect(200);
    expect(list.body).toEqual([]);
  });

  it("hides a deleted player from lists and refuses their token's owner nothing new", async () => {
    const keep = await registerPlayer({ city: "Nis" });
    const gone = await registerPlayer({ city: "Nis" });
    await api().delete(`/players/${gone.id}`).set(bearer(gone.accessToken)).expect(200);

    const byCity = await api().get("/players/city/Nis").set(bearer(keep.accessToken)).expect(200);
    expect(byCity.body.map((p: { entityId: string }) => p.entityId)).toEqual([keep.id]);
    const all = await api().get("/players").set(bearer(keep.accessToken)).expect(200);
    expect(all.body.map((p: { entityId: string }) => p.entityId)).toEqual([keep.id]);
    await api().get(`/players/${gone.id}`).set(bearer(keep.accessToken)).expect(404);
  });

  it("frees a deleted player's email for a new sign-up", async () => {
    const gone = await registerPlayer();
    await api().delete(`/players/${gone.id}`).set(bearer(gone.accessToken)).expect(200);
    await registerPlayer({ email: gone.email });
  });

  it("answers 404, not a ghost record, when updating or deleting an unknown id", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    for (const path of ["/clubs", "/courts", "/bookings", "/matches", "/requests", "/rackets"]) {
      await api().delete(`${path}/missing-id`).set(bearer(admin.token)).expect(404);
    }
    await api().patch("/clubs/missing-id").set(bearer(admin.token)).send({ name: "x" }).expect(404);
    const all = await api().get("/clubs/all").set(bearer(admin.token)).expect(200);
    expect(all.body).toEqual([]);
  });

  it("hides deleted partner requests and matches", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const court = await createCourt(admin.token);
    const player = await registerPlayer();
    const other = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);

    const request = (
      await api()
        .post("/requests")
        .set(bearer(player.accessToken))
        .send({ bookingEntityID: booking, numberOfPlayersNeeded: 1 })
        .expect(200)
    ).text;
    expect((await api().get("/requests").set(bearer(other.accessToken)).expect(200)).body).toHaveLength(1);
    await api().delete(`/requests/${request}`).set(bearer(player.accessToken)).expect(200);
    expect((await api().get("/requests").set(bearer(other.accessToken)).expect(200)).body).toEqual([]);

    const match = (
      await api()
        .post("/matches")
        .set(bearer(player.accessToken))
        .send({ firstTeam: player.id, secondTeam: other.id, result: "6-0", court, date: "2026-11-01" })
        .expect(200)
    ).text;
    expect(
      (await api().get(`/matches/player/${player.id}`).set(bearer(player.accessToken)).expect(200)).body
    ).toHaveLength(1);
    await api().delete(`/matches/${match}`).set(bearer(player.accessToken)).expect(200);
    expect((await api().get(`/matches/player/${player.id}`).set(bearer(player.accessToken)).expect(200)).body).toEqual(
      []
    );
    await api().get(`/matches/${match}`).set(bearer(player.accessToken)).expect(404);
  });
});
