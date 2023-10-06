import { Club } from "../entities/club";
import ClubCreateRequest from "../requests/clubCreateRequest";
import UpdateClubRequest from "../requests/updateClubRequest";
import { clubSchema } from "../schemas/clubSchema";
import BaseRepository from "./baseRepository";

export default class ClubRepository extends BaseRepository<Club> {
  constructor(){
    super(clubSchema)
  }

  async createClub(createRequest: ClubCreateRequest) {
    const club = await this.createEntity();
    
    club.name = createRequest.name;
    club.address = createRequest.address;
    club.description = createRequest.description;
    club.city = createRequest.city;
    club.country = createRequest.country;

    return await this.repository.save(club);
  }

  async incrementClubCourtCount(clubEntityID: string) {
    const club = await this.findByEntityID(clubEntityID);
    club.courts++;
    return await this.repository.save(club);
  }

  async findClubsByCity(city: string) {
    return await this.findAllByField(city, "city");
  }
  
  async updateClub(entityId: string, updateRequest: UpdateClubRequest) {
    return "";
}

}