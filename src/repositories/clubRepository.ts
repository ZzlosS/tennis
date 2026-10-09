import { Club } from "../entities/club";
import { DEFAULT_CURRENCY } from "../http/money";
import { PageQuery } from "../http/pagination";
import ClubCreateRequest from "../requests/clubCreateRequest";
import UpdateClubRequest from "../requests/updateClubRequest";
import { clubSchema } from "../schemas/clubSchema";
import { DEFAULT_CANCEL_CUTOFF_HOURS } from "../services/courtSchedule";
import { DEFAULT_OPENING_HOURS, DEFAULT_TIME_ZONE } from "../services/time";
import { formatLocation, PlaceIndex } from "../services/geo";
import BaseRepository from "./baseRepository";

export default class ClubRepository extends BaseRepository<Club> {
  constructor() {
    super(clubSchema);
  }

  async createClub(createRequest: ClubCreateRequest) {
    const club = await this.createEntity();

    club.name = createRequest.name;
    club.address = createRequest.address;
    club.description = createRequest.description;
    club.city = createRequest.city;
    club.country = createRequest.country;
    club.currency = createRequest.currency ?? DEFAULT_CURRENCY;
    club.admins = [];
    club.timeZone = createRequest.timeZone ?? DEFAULT_TIME_ZONE;
    club.openingHours = JSON.stringify(createRequest.openingHours ?? DEFAULT_OPENING_HOURS);
    club.cancelCutoffHours = createRequest.cancelCutoffHours ?? DEFAULT_CANCEL_CUTOFF_HOURS;
    club.seasonEndsOn = createRequest.seasonEndsOn ?? "";
    club.location = this.locationOf(createRequest.latitude, createRequest.longitude);

    return await this.saveAndIndex(club);
  }

  private locationOf(latitude?: number, longitude?: number) {
    return latitude !== undefined && longitude !== undefined ? formatLocation(latitude, longitude) : "";
  }

  // The map is kept in step with every save.
  private async saveAndIndex(club: Club) {
    const id = await this.save(club);
    await PlaceIndex.sync("CLUB", id, club.location);
    return id;
  }

  async deleteEntity(entityID: string) {
    const id = await super.deleteEntity(entityID);
    await PlaceIndex.remove("CLUB", entityID);
    return id;
  }

  async addAdmin(clubEntityID: string, playerEntityID: string) {
    const club = await this.findByIdOrThrow(clubEntityID, "Club");
    club.admins = [...new Set([...(club.admins ?? []), playerEntityID])];
    return await this.save(club);
  }

  async findClubsPage(city: string | undefined, query: PageQuery) {
    return await this.findPage((search) => (city ? search.where("city").equals(city) : search), query);
  }

  // The clubs this player is an admin of.
  async findClubsPageByAdmin(playerId: string, query: PageQuery) {
    return await this.findPage((search) => search.where("admins").contains(playerId), query);
  }

  async updateClub(entityId: string, updateRequest: UpdateClubRequest) {
    const club = await this.findByIdOrThrow(entityId, "Club");

    if (updateRequest.name) {
      club.name = updateRequest.name;
    }
    if (updateRequest.address) {
      club.address = updateRequest.address;
    }
    if (updateRequest.description !== undefined) {
      club.description = updateRequest.description;
    }
    if (updateRequest.city) {
      club.city = updateRequest.city;
    }
    if (updateRequest.country) {
      club.country = updateRequest.country;
    }
    if (updateRequest.currency) {
      club.currency = updateRequest.currency;
    }
    if (updateRequest.timeZone) {
      club.timeZone = updateRequest.timeZone;
    }
    if (updateRequest.openingHours) {
      club.openingHours = JSON.stringify(updateRequest.openingHours);
    }
    if (updateRequest.cancelCutoffHours !== undefined) {
      club.cancelCutoffHours = updateRequest.cancelCutoffHours;
    }
    if (updateRequest.seasonEndsOn !== undefined) {
      club.seasonEndsOn = updateRequest.seasonEndsOn;
    }
    if (updateRequest.latitude !== undefined && updateRequest.longitude !== undefined) {
      club.location = formatLocation(updateRequest.latitude, updateRequest.longitude);
    }

    return await this.saveAndIndex(club);
  }
}
