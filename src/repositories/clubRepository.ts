import ClubDto from "../dtos/clubDto";
import { Club } from "../entities/club";
import { clubSchema } from "../schemas/clubSchema";
import BaseRepository from "./baseRepository";

export default class ClubRepository extends BaseRepository<Club> {
  constructor(){
    super(clubSchema)
  }

  async createClub(dto: ClubDto) {
    const club = await this.createEntity();
    
    club.name = dto.name;
    club.address = dto.address;
    club.description = dto.description;
    club.city = dto.city;
    club.country = dto.country;

    return await this.repository.save(club);
  }

  async incrementClubCourtCount(clubEntityID: string) {
    const club = await this.repository.fetch(clubEntityID);
    club.courts++;
    return await this.repository.save(club);
  }

  async findClubsByCity(city: string) {
    return await this.findAllByField(city, "city");
  }
}