import { Example, Get, Query, Response, Route, Security, Tags } from "tsoa";
import CourtKind from "../enums/courtKind";
import { ValidationError } from "../errors/appError";
import { placePageExample } from "../http/examples";
import { Page, pageOfArray } from "../http/pagination";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import { ErrorBody } from "../responses/common";
import PlaceResponse from "../responses/placeResponse";
import { NearbyPlace, parseLocation, PlaceIndex } from "../services/geo";

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 200;
// Enough pins for any one map view.
const MAX_PLACES = 500;

// Clubs and courts around a point, for the map.
@Tags("Places")
@Route("places")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
export class PlaceController {
  private clubs = new ClubRepository();
  private courts = new CourtRepository();

  /**
   * Clubs and public or private courts within a radius of a point, nearest first. Club courts are not listed on
   * their own: they are part of their club's pin. Clubs and courts without coordinates are not on the map.
   * @param lat Latitude of the centre, -90 to 90.
   * @param lng Longitude of the centre, -180 to 180.
   * @param radiusKm Search radius in kilometres, up to 200. Default 10.
   * @param kind Only pins of this kind: CLUB, PUBLIC or PRIVATE.
   * @param q Only places whose name or city contains this text.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(placePageExample)
  @Get("/")
  async getPlaces(
    @Query() lat: number,
    @Query() lng: number,
    @Query() radiusKm?: number,
    @Query() kind?: CourtKind,
    @Query() q?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<PlaceResponse>> {
    const radius = radiusKm ?? DEFAULT_RADIUS_KM;
    const problems: Record<string, string[]> = {};
    if (!(lat >= -90 && lat <= 90)) problems.lat = ["Must be from -90 to 90"];
    if (!(lng >= -180 && lng <= 180)) problems.lng = ["Must be from -180 to 180"];
    if (!(radius > 0 && radius <= MAX_RADIUS_KM))
      problems.radiusKm = [`Must be more than 0 and at most ${MAX_RADIUS_KM}`];
    if (Object.keys(problems).length > 0) {
      throw new ValidationError("Validation failed", problems);
    }

    const nearby = await PlaceIndex.near({ latitude: lat, longitude: lng }, radius, MAX_PLACES);
    const needle = q?.trim().toLowerCase();
    const places = (await Promise.all(nearby.map((place) => this.describe(place))))
      .filter((place): place is PlaceResponse => place !== null)
      .filter((place) => !kind || place.kind === kind)
      .filter((place) => !needle || `${place.name} ${place.city}`.toLowerCase().includes(needle));
    return await pageOfArray(places, { limit, cursor }, (place) => place);
  }

  // Null when the record is gone since the map was last updated.
  private async describe({ type, id, distanceKm }: NearbyPlace): Promise<PlaceResponse | null> {
    const rounded = Math.round(distanceKm * 100) / 100;
    if (type === "CLUB") {
      const club = await this.clubs.findByEntityID(id);
      const where = parseLocation(club.location);
      if (club.uuid == null || club.deleted || !where) return null;
      return {
        id,
        kind: CourtKind.CLUB,
        name: club.name,
        address: club.address,
        city: club.city,
        ...where,
        distanceKm: rounded,
        courtCount: await this.courts.countClubCourts(id),
      };
    }
    const court = await this.courts.findByEntityID(id);
    const where = parseLocation(court.location);
    if (court.uuid == null || court.deleted || court.active === false || !where) return null;
    return {
      id,
      kind: court.kind,
      name: court.name,
      address: court.address,
      city: court.city,
      ...where,
      distanceKm: rounded,
      courtCount: 1,
    };
  }
}
