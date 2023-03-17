import { Entity } from "redis-om";
import MatchDto from "../dtos/matchDto";
import { Match } from "../entities/match";
import { matchSchema } from "../schemas/matchSchema";
import BaseRepository from "./baseRepository";

export default class MatchRepository extends BaseRepository<Match> {
  constructor() {
    super(matchSchema)
  }

  async createMatch(dto: MatchDto) {
    const match = await this.createEntity();

    match.firstTeam = dto.firstTeam;
    match.secondTeam = dto.secondTeam;
    match.result = dto.result;
    match.court = dto.court;

    return await this.save(match);
  }
  
  async findMatchesByCourt(courtEntityID: string) {
    return await this.findAllByField(courtEntityID, "court");
  }

  async findMatchesByDate(date: Date | string | number) {
    return await this.findAllByDate(date, "date");
  }

  async findPlayerMatches(playerEntityID: string) {
    return await this.repository.search()
                .where('firstTeam').contains(playerEntityID)
                .or('secondTeam').contains(playerEntityID).return.all();
  }
}