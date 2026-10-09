import { describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { api, bearer, createBooking, createClub, createCourt, playerWithRole, registerPlayer } from "./helpers";

const ids = (body: { items: { id: string }[] }) => body.items.map((item) => item.id);

describe("soft delete", () => {
  it("hides a deleted club from lists and answers 404 by id", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const keep = await createClub(admin.token, { name: "Keep", city: "Belgrade" });
    const gone = await createClub(admin.token, { name: "Gone", city: "Belgrade" });
    await api().delete(`/clubs/${gone}`).set(bearer(admin.token)).expect(204);

    const byCity = await api().get("/clubs?city=Belgrade").set(bearer(admin.token)).expect(200);
    expect(ids(byCity.body)).toEqual([keep]);
    const all = await api().get("/clubs").set(bearer(admin.token)).expect(200);
    expect(ids(all.body)).toEqual([keep]);
    const byId = await api().get(`/clubs/${gone}`).set(bearer(admin.token));
    expect(byId.status).toBe(404);
    expect(byId.body.error.code).toBe("NOT_FOUND");
  });

  it("hides a deleted court from the club, the lists and the price filter", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const keep = await createCourt(admin.token, club, { pricePerHourMinor: 90000 });
    const gone = await createCourt(admin.token, club, { pricePerHourMinor: 95000 });
    await api().delete(`/courts/${gone}`).set(bearer(admin.token)).expect(204);

    const clubBody = (await api().get(`/clubs/${club}`).set(bearer(admin.token)).expect(200)).body;
    expect(clubBody.courtCount).toBe(1);
    expect(clubBody.courts).toHaveLength(1);
    expect(ids((await api().get(`/clubs/${club}/courts`).set(bearer(admin.token)).expect(200)).body)).toEqual([keep]);
    expect(ids((await api().get("/courts").set(bearer(admin.token)).expect(200)).body)).toEqual([keep]);
    const cheap = await api().get("/courts?minPrice=0&maxPrice=200000").set(bearer(admin.token)).expect(200);
    expect(ids(cheap.body)).toEqual([keep]);
    await api().get(`/courts/${gone}`).set(bearer(admin.token)).expect(404);
  });

  it("hides a deleted booking", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const court = await createCourt(admin.token, club);
    const player = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);
    await api().delete(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(204);

    await api().get(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(404);
    await api().delete(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(404);
    const list = await api().get("/bookings").set(bearer(player.accessToken)).expect(200);
    expect(list.body.items).toEqual([]);
  });

  it("hides a deleted player from lists", async () => {
    const keep = await registerPlayer({ city: "Nis" });
    const gone = await registerPlayer({ city: "Nis" });
    await api().delete(`/players/${gone.id}`).set(bearer(gone.accessToken)).expect(204);

    const byCity = await api().get("/players?city=Nis").set(bearer(keep.accessToken)).expect(200);
    expect(ids(byCity.body)).toEqual([keep.id]);
    const all = await api().get("/players").set(bearer(keep.accessToken)).expect(200);
    expect(ids(all.body)).toEqual([keep.id]);
    await api().get(`/players/${gone.id}`).set(bearer(keep.accessToken)).expect(404);
  });

  it("frees a deleted player's email for a new sign-up", async () => {
    const gone = await registerPlayer();
    await api().delete(`/players/${gone.id}`).set(bearer(gone.accessToken)).expect(204);
    await registerPlayer({ email: gone.email });
  });

  it("answers 404, not a ghost record, when updating or deleting an unknown id", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    for (const path of ["/clubs", "/courts", "/bookings", "/matches", "/partner-requests", "/rackets"]) {
      await api().delete(`${path}/missing-id`).set(bearer(admin.token)).expect(404);
    }
    await api().patch("/clubs/missing-id").set(bearer(admin.token)).send({ name: "x" }).expect(404);
    const all = await api().get("/clubs").set(bearer(admin.token)).expect(200);
    expect(all.body.items).toEqual([]);
  });

  it("hides deleted partner requests and matches", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const court = await createCourt(admin.token, club);
    const player = await registerPlayer();
    const other = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);

    const request = (
      await api()
        .post("/partner-requests")
        .set(bearer(player.accessToken))
        .send({ bookingId: booking, playersNeeded: 1 })
        .expect(201)
    ).body.id;
    expect((await api().get("/partner-requests").set(bearer(other.accessToken)).expect(200)).body.items).toHaveLength(
      1
    );
    await api().delete(`/partner-requests/${request}`).set(bearer(player.accessToken)).expect(204);
    expect((await api().get("/partner-requests").set(bearer(other.accessToken)).expect(200)).body.items).toEqual([]);

    const match = (
      await api()
        .post("/matches")
        .set(bearer(player.accessToken))
        .send({
          firstTeam: [player.id],
          secondTeam: [other.id],
          sets: [
            { firstTeam: 6, secondTeam: 0 },
            { firstTeam: 6, secondTeam: 1 },
          ],
          courtId: court,
          playedAt: "2026-11-01T10:00:00Z",
        })
        .expect(201)
    ).body.id;
    const mine = () => api().get(`/matches?playerId=${player.id}`).set(bearer(player.accessToken)).expect(200);
    expect((await mine()).body.items).toHaveLength(1);
    await api().delete(`/matches/${match}`).set(bearer(player.accessToken)).expect(204);
    expect((await mine()).body.items).toEqual([]);
    await api().get(`/matches/${match}`).set(bearer(player.accessToken)).expect(404);
  });

  it("takes the partner requests for a booking down with the booking", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const court = await createCourt(admin.token, club);
    const player = await registerPlayer();
    const booking = await createBooking(player.accessToken, court);
    await api()
      .post("/partner-requests")
      .set(bearer(player.accessToken))
      .send({ bookingId: booking, playersNeeded: 1 })
      .expect(201);

    await api().delete(`/bookings/${booking}`).set(bearer(player.accessToken)).expect(204);
    expect((await api().get("/partner-requests").set(bearer(player.accessToken)).expect(200)).body.items).toEqual([]);
  });
});
