import { COURT_UNASSIGNED_CLUB } from "../consts";
import CourtDto from "../dtos/courtDto";
import { Court } from "../entities/court";
import { courtSchema } from "../schemas/courtSchema";
import BaseRepository from "./baseRepository";

export default class CourtRepository extends BaseRepository<Court> {
  constructor() {
    super(courtSchema);
  }

  async createCourt(dto: CourtDto) {
    const court = await this.createEntity();

    court.name = dto.name;
    court.surface = dto.surface;
    court.stands = dto.stands;
    court.roof = dto.roof;
    court.double = dto.double;
    court.pricePerHour = dto.pricePerHour;
    court.club = COURT_UNASSIGNED_CLUB;

    return await this.repository.save(court);
  }

  async findClubCourts(clubEntityID: string) {
    return await this.findAllByField(clubEntityID, "club");
  }

  async assignToClub(courtEntityID: string, clubEntityID: string) {
    const court = await this.repository.fetch(courtEntityID);
    court.club = clubEntityID;
    return await this.repository.save(court);
  }

  async findUnassignedCourts() {
    return await this.findAllByField(COURT_UNASSIGNED_CLUB, "club");
  }
}
