import { Club } from "../entities/club";
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
    club.admins = [];

    return await this.repository.save(club);
  }

  async incrementClubCourtCount(clubEntityID: string) {
    const club = await this.findByIdOrThrow(clubEntityID, "Club");
    club.courts++;
    return await this.repository.save(club);
  }

  async decrementClubCourtCount(clubEntityID: string) {
    const club = await this.findByEntityID(clubEntityID);
    if (club.uuid != null && club.courts > 0) {
      club.courts--;
      return await this.repository.save(club);
    }
  }

  async addAdmin(clubEntityID: string, playerEntityID: string) {
    const club = await this.findByIdOrThrow(clubEntityID, "Club");
    club.admins = [...new Set([...(club.admins ?? []), playerEntityID])];
    return await this.repository.save(club);
  }

  async findClubsByCity(city: string) {
    return await this.findAllByField(city, "city");
  }

  async updateClub(entityId: string, updateRequest: UpdateClubRequest) {
    const club = await this.findByIdOrThrow(entityId, "Club");

    if (updateRequest.name) {
      club.name = updateRequest.name;
    }
    if (updateRequest.address) {
      club.address = updateRequest.address;
    }
    if (updateRequest.description) {
      club.description = updateRequest.description;
    }
    if (updateRequest.city) {
      club.city = updateRequest.city;
    }
    if (updateRequest.country) {
      club.country = updateRequest.country;
    }

    return await this.repository.save(club);
  }
}
