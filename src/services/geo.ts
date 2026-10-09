import RedisClient from "./redisClient";

// Every club and every court without a club that has a place on the map, in one Redis GEO set.
export const PLACES_KEY = "geo:places";

export type PlaceType = "CLUB" | "COURT";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Stored on a record as "latitude,longitude"; an empty string means no place on the map.
export function formatLocation(latitude: number, longitude: number): string {
  return `${latitude},${longitude}`;
}

export function parseLocation(location: string | undefined): Coordinates | null {
  if (!location) {
    return null;
  }
  const [latitude, longitude] = location.split(",").map(Number);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

const memberOf = (type: PlaceType, id: string) => `${type === "CLUB" ? "club" : "court"}:${id}`;

export interface NearbyPlace {
  type: PlaceType;
  id: string;
  distanceKm: number;
}

export const PlaceIndex = {
  // Puts the place on the map, or takes it off when it has no coordinates or should not be listed.
  async sync(type: PlaceType, id: string, location: string | undefined, listed = true): Promise<void> {
    const coordinates = listed ? parseLocation(location) : null;
    if (coordinates) {
      await RedisClient.execute("GEOADD", PLACES_KEY, coordinates.longitude, coordinates.latitude, memberOf(type, id));
    } else {
      await RedisClient.execute("ZREM", PLACES_KEY, memberOf(type, id));
    }
  },

  async remove(type: PlaceType, id: string): Promise<void> {
    await RedisClient.execute("ZREM", PLACES_KEY, memberOf(type, id));
  },

  // Places within a radius, nearest first.
  async near(center: Coordinates, radiusKm: number, max: number): Promise<NearbyPlace[]> {
    const rows = (await RedisClient.execute(
      "GEOSEARCH",
      PLACES_KEY,
      "FROMLONLAT",
      center.longitude,
      center.latitude,
      "BYRADIUS",
      radiusKm,
      "km",
      "ASC",
      "COUNT",
      max,
      "WITHDIST"
    )) as [string, string][];
    return rows.map(([member, distance]) => {
      const [kind, id] = [member.slice(0, member.indexOf(":")), member.slice(member.indexOf(":") + 1)];
      return { type: kind === "club" ? "CLUB" : "COURT", id, distanceKm: Number(distance) };
    });
  },
};
