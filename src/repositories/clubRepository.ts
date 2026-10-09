import { Club } from "../entities/club";
import { DEFAULT_CURRENCY } from "../http/money";
import { PageQuery } from "../http/pagination";
import ClubCreateRequest from "../requests/clubCreateRequest";
import UpdateClubRequest from "../requests/updateClubRequest";
import { clubSchema } from "../schemas/clubSchema";
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

    return await this.save(club);
  }

  async addAdmin(clubEntityID: string, playerEntityID: string) {
    const club = await this.findByIdOrThrow(clubEntityID, "Club");
    club.admins = [...new Set([...(club.admins ?? []), playerEntityID])];
    return await this.save(club);
  }

  async findClubsPage(city: string | undefined, query: PageQuery) {
    return await this.findPage((search) => (city ? search.where("city").equals(city) : search), query);
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

    return await this.save(club);
  }
}
