import { Match } from "../entities/match";
import { PageQuery } from "../http/pagination";
import CreateMatchRequest from "../requests/createMatchRequest";
import UpdateMatchRequest from "../requests/updateMatchRequest";
import { SetScore } from "../responses/matchResponse";
import { matchSchema } from "../schemas/matchSchema";
import BaseRepository from "./baseRepository";

export const parseSets = (match: Match): SetScore[] => JSON.parse(match.sets || "[]");

export default class MatchRepository extends BaseRepository<Match> {
  constructor() {
    super(matchSchema);
  }

  async createMatch(request: CreateMatchRequest) {
    const match = await this.createEntity();

    match.firstTeam = request.firstTeam;
    match.secondTeam = request.secondTeam;
    match.sets = JSON.stringify(request.sets);
    match.court = request.courtId;
    match.playedAt = new Date(request.playedAt);

    return await this.save(match);
  }

  async findMatchesPage(query: PageQuery) {
    return await this.findPage((search) => search, query);
  }

  // Oldest first. The OR is filtered in code because in a query AND binds tighter than OR and would change the meaning.
  async findPlayerMatches(playerId: string) {
    await this.initializeRepository();
    const matches = await this.repository
      .search()
      .where("firstTeam")
      .contains(playerId)
      .or("secondTeam")
      .contains(playerId)
      .return.all();
    return this.withIds(matches.filter((match) => !match.deleted)).sort((a, b) => a.createdAt! - b.createdAt!);
  }

  async updateMatch(entityId: string, updateRequest: UpdateMatchRequest) {
    const match = await this.findByIdOrThrow(entityId, "Match");

    if (updateRequest.firstTeam) {
      match.firstTeam = updateRequest.firstTeam;
    }
    if (updateRequest.secondTeam) {
      match.secondTeam = updateRequest.secondTeam;
    }
    if (updateRequest.sets) {
      match.sets = JSON.stringify(updateRequest.sets);
    }
    if (updateRequest.courtId) {
      match.court = updateRequest.courtId;
    }
    if (updateRequest.playedAt) {
      match.playedAt = new Date(updateRequest.playedAt);
    }

    return await this.save(match);
  }
}
