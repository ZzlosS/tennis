import { beforeEach, describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import {
  api,
  bearer,
  createClub,
  createCourt,
  createLooseCourt,
  playerWithRole,
  registerPlayer,
  Session,
} from "./helpers";

// Belgrade centre, and places at known distances from it.
const BELGRADE = { lat: 44.8125, lng: 20.4612 };
const NEAR = { latitude: 44.8231, longitude: 20.4505 }; // about 1.4 km
const FAR = { latitude: 45.2671, longitude: 19.8335 }; // Novi Sad, about 80 km

let admin: Session;

beforeEach(async () => {
  admin = await playerWithRole(Role.ADMIN);
});

const search = async (query: string) =>
  (await api().get(`/places?lat=${BELGRADE.lat}&lng=${BELGRADE.lng}${query}`).set(bearer(admin.token)).expect(200)).body
    .items as { id: string; kind: string; name: string; distanceKm: number; courtCount: number }[];

describe("places on the map", () => {
  it("lists clubs and loose courts nearest first, with their kind and distance", async () => {
    const near = await createClub(admin.token, { name: "TK Near", ...NEAR });
    await createCourt(admin.token, near);
    await createCourt(admin.token, near);
    const far = await createClub(admin.token, { name: "TK Far", ...FAR });
    const player = await registerPlayer();
    const park = await createLooseCourt(player.accessToken, {
      name: "Park",
      latitude: 44.8,
      longitude: 20.47,
    });
    await createClub(admin.token, { name: "TK Nowhere" });

    const places = await search("&radiusKm=200");
    expect(places.map((p) => p.id)).toEqual([near, park, far]);
    expect(places.map((p) => p.kind)).toEqual(["CLUB", "PUBLIC", "CLUB"]);
    expect(places.find((p) => p.id === near)).toMatchObject({ courtCount: 2 });
    expect(places[0].distanceKm).toBeLessThan(places[1].distanceKm);
    expect(places[2].distanceKm).toBeGreaterThan(70);
  });

  it("keeps to the radius, the kind and the search text", async () => {
    const near = await createClub(admin.token, { name: "TK Zvezdara", city: "Belgrade", ...NEAR });
    await createClub(admin.token, { name: "TK Dunav", city: "Novi Sad", ...FAR });
    const player = await registerPlayer();
    await createLooseCourt(player.accessToken, { name: "Park", latitude: 44.8, longitude: 20.47 });

    expect((await search("")).map((p) => p.id)).toContain(near);
    expect((await search("")).map((p) => p.name)).not.toContain("TK Dunav");
    expect((await search("&kind=CLUB&radiusKm=200")).map((p) => p.name)).toEqual(["TK Zvezdara", "TK Dunav"]);
    expect((await search("&q=zvezd")).map((p) => p.name)).toEqual(["TK Zvezdara"]);
    expect((await search("&q=novi&radiusKm=200")).map((p) => p.name)).toEqual(["TK Dunav"]);
  });

  it("drops a place when it is moved, closed, handed to a club or deleted", async () => {
    const club = await createClub(admin.token, { name: "TK Mover", ...NEAR });
    const player = await registerPlayer();
    const courtId = await createLooseCourt(player.accessToken, { latitude: 44.8, longitude: 20.47 });
    expect(await search("")).toHaveLength(2);

    await api()
      .patch(`/clubs/${club}`)
      .set(bearer(admin.token))
      .send({ latitude: FAR.latitude, longitude: FAR.longitude })
      .expect(200);
    expect((await search("")).map((p) => p.id)).toEqual([courtId]);

    await api().patch(`/courts/${courtId}`).set(bearer(player.accessToken)).send({ active: false }).expect(200);
    expect(await search("")).toEqual([]);
    await api().patch(`/courts/${courtId}`).set(bearer(player.accessToken)).send({ active: true }).expect(200);
    expect(await search("")).toHaveLength(1);

    await api().post(`/courts/${courtId}/assign`).set(bearer(player.accessToken)).send({ clubId: club }).expect(200);
    expect(await search("")).toEqual([]);

    const other = await createClub(admin.token, { name: "TK Gone", ...NEAR });
    expect(await search("")).toHaveLength(1);
    await api().delete(`/clubs/${other}`).set(bearer(admin.token)).expect(204);
    expect(await search("")).toEqual([]);
  });

  it("shows coordinates on clubs and courts, and a club court is where its club is", async () => {
    const club = await createClub(admin.token, { ...NEAR });
    const courtId = await createCourt(admin.token, club);
    const clubBody = (await api().get(`/clubs/${club}`).set(bearer(admin.token)).expect(200)).body;
    expect(clubBody).toMatchObject(NEAR);
    const court = (await api().get(`/courts/${courtId}`).set(bearer(admin.token)).expect(200)).body;
    expect(court).toMatchObject(NEAR);

    await api().patch(`/courts/${courtId}`).set(bearer(admin.token)).send({ latitude: 1, longitude: 1 }).expect(400);
  });

  it("refuses bad coordinates and a half pair", async () => {
    await api().get("/places?lat=91&lng=0").set(bearer(admin.token)).expect(400);
    await api().get(`/places?lat=44&lng=20&radiusKm=1000`).set(bearer(admin.token)).expect(400);
    await api().get("/places").set(bearer(admin.token)).expect(400);
    await api()
      .post("/clubs")
      .set(bearer(admin.token))
      .send({ name: "x", address: "a", description: "", city: "c", country: "d", latitude: 44 })
      .expect(400);
  });
});
