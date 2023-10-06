import MatchDto from "../dtos/matchDto";
import { Match } from "../entities/match";
import CreateMatchRequest from "../requests/createMatchRequest";
import UpdateMatchRequest from "../requests/updateMatchRequest";
import { matchSchema } from "../schemas/matchSchema";
import BaseRepository from "./baseRepository";

export default class MatchRepository extends BaseRepository<Match> {
  constructor() {
    super(matchSchema)
  }

  async createMatch(createMatchRequest: CreateMatchRequest) {
    const match = await this.createEntity();

    match.firstTeam = createMatchRequest.firstTeam.split(',');
    match.secondTeam = createMatchRequest.secondTeam.split(',');
    match.result = createMatchRequest.result.split(',');
    match.court = createMatchRequest.court;
    match.date = new Date(createMatchRequest.date);

    return await this.save(match);
  }
  
  async findMatchesByCourt(courtEntityID: string) {
    return await this.findAllByField(courtEntityID, "court");
  }

  async findPlayerMatches(playerEntityID: string) {
    await this.initializeRepository();
    return await this.repository.search()
                .where('firstTeam').contains(playerEntityID)
                .or('secondTeam').contains(playerEntityID).return.all();
  }


  async updateMatch(entityId: string, updateRequest: UpdateMatchRequest) {
    const match = await this.findByEntityID(entityId);

    if(updateRequest.firstTeam){
      match.firstTeam = updateRequest.firstTeam;
    }
    if(updateRequest.secondTeam){
      match.secondTeam = updateRequest.secondTeam;
    }
    if(updateRequest.result){
      match.result = updateRequest.result;
    }
    if(updateRequest.court){
      match.court = updateRequest.court;
    }
    if(updateRequest.date){
      match.date = new Date(updateRequest.date);
    }

    return await this.save(match);
  }
}