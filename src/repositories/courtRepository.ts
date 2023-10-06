import { COURT_UNASSIGNED_CLUB } from "../consts";
import { Court } from "../entities/court";
import CourtCreateRequest from "../requests/courtCreateRequest";
import UpdateCourtRequest from "../requests/updateCourtRequest";
import { courtSchema } from "../schemas/courtSchema";
import BaseRepository from "./baseRepository";

export default class CourtRepository extends BaseRepository<Court> {
  constructor() {
    super(courtSchema);
  }

  async createCourt(createRequest: CourtCreateRequest) {
    const court = await this.createEntity();

    court.name = createRequest.name;
    court.surface = createRequest.surface;
    court.stands = createRequest.stands;
    court.roof = createRequest.roof;
    court.double = createRequest.double;
    court.pricePerHour = createRequest.pricePerHour;
    court.club = COURT_UNASSIGNED_CLUB;

    return await this.repository.save(court);
  }

  async findClubCourts(clubEntityID: string) {
    return await this.findAllByField(clubEntityID, "club");
  }

  async assignToClub(courtEntityID: string, clubEntityID: string) {
    const court = await this.findByEntityID(courtEntityID);
    court.club = clubEntityID;
    return await this.repository.save(court);
  }

  async findUnassignedCourts() {
    return await this.findAllByField(COURT_UNASSIGNED_CLUB, "club");
  }

  async findByPrice(from: number, to: number) {
    await this.initializeRepository();

    let courts = this.repository.search();
    
    courts = courts.where("pricePerHour").greaterThanOrEqualTo(from);
    
    courts = courts.where("pricePerHour").lessThanOrEqualTo(to);
    
    return await courts.return.all();
  }

  async updateCourt(entityId: string, updateRequest: UpdateCourtRequest) {
    const court = await this.findByEntityID(entityId);

    if(updateRequest.name){
      court.name = updateRequest.name;
    }
    if(updateRequest.surface){
      court.surface = updateRequest.surface;
    }
    if(updateRequest.stands){
      court.stands = updateRequest.stands;
    }
    if(updateRequest.roof){
      court.roof = updateRequest.roof;
    }
    if(updateRequest.double){
      court.double = updateRequest.double;
    }
    if(updateRequest.pricePerHour){
      court.pricePerHour = updateRequest.pricePerHour;
    }

    return await this.save(court);
  }

}
