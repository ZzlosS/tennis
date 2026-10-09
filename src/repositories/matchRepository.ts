import { Match } from "../entities/match";
import MatchStatus from "../enums/matchStatus";
import { NotFoundError } from "../errors/appError";
import { moveMatchStatus, runScript } from "../redis/scripts";
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

  async createMatch(request: CreateMatchRequest, createdBy: string, status: MatchStatus) {
    const match = await this.createEntity();

    match.firstTeam = request.firstTeam;
    match.secondTeam = request.secondTeam;
    match.sets = JSON.stringify(request.sets);
    match.court = request.courtId;
    match.playedAt = new Date(request.playedAt);
    match.status = status;
    match.createdBy = createdBy;

    return await this.save(match);
  }

  async findMatchesPage(status: MatchStatus | undefined, query: PageQuery) {
    return await this.findPage((search) => (status ? search.where("status").equals(status) : search), query);
  }

  // Moves the match on only if it is still in the status `from`. False when someone else got there first.
  async moveStatus(matchId: string, from: MatchStatus, to: MatchStatus): Promise<boolean> {
    const result = await runScript(moveMatchStatus, [`Match:${matchId}`], [from, to]);
    if (result === "MISSING") {
      throw new NotFoundError("Match not found");
    }
    return result === "OK";
  }

  // Oldest first, or the newest played first. The OR is filtered in code because in a query AND binds tighter than OR
  // and would change the meaning.
  async findPlayerMatches(playerId: string, options: { status?: MatchStatus; newestFirst?: boolean } = {}) {
    await this.initializeRepository();
    const matches = await this.repository
      .search()
      .where("firstTeam")
      .contains(playerId)
      .or("secondTeam")
      .contains(playerId)
      .return.all();
    const found = this.withIds(
      matches.filter((match) => !match.deleted && (!options.status || match.status === options.status))
    );
    return options.newestFirst
      ? found.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
      : found.sort((a, b) => a.createdAt! - b.createdAt!);
  }

  // A changed score starts over: the other team has to agree with it. An ADMIN's change to a confirmed match stays confirmed.
  async updateMatch(entityId: string, updateRequest: UpdateMatchRequest, editor: { id: string; keepStatus: boolean }) {
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
    if (!editor.keepStatus) {
      match.status = MatchStatus.PENDING;
      match.createdBy = editor.id;
    }

    return await this.save(match);
  }
}
