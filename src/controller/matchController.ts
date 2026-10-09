import { Tags, Route, Get, Path, Post, Body, Delete, Patch, Security } from "tsoa";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import MatchRepository from "../repositories/matchRepository";
import MatchResponse from "../responses/matchResponse";
import CreateMatchRequest from "../requests/createMatchRequest";
import PlayerRepository from "../repositories/playerRepository";
import { Match } from "../entities/match";
import UpdateMatchRequest from "../requests/updateMatchRequest";
import { splitIds } from "../repositories/matchRepository";
import { ForbiddenError } from "../errors/appError";
import { isAdmin } from "../services/access";
import { AuthUser } from "../services/tokenService";

@Tags("Matches")
@Route("matches")
export default class MatchController {
  repository: MatchRepository;
  courtRepository: CourtRepository;
  clubRepository: ClubRepository;
  playerRepository: PlayerRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.user = user;
    this.repository = new MatchRepository();
    this.courtRepository = new CourtRepository();
    this.clubRepository = new ClubRepository();
    this.playerRepository = new PlayerRepository();
  }

  @Get("/all")
  @Security("jwt")
  async getAllMatches(): Promise<MatchResponse[]> {
    let matches = await this.repository.findAll();
    let data: MatchResponse[] = [];
    for (let index = 0; index < matches.length; index++) {
      data.push(await this.convertMatchModelToResponse(matches[index]));
    }

    return data;
  }

  @Get("/player/{entityId}")
  @Security("jwt")
  async getPlayersMatches(@Path() entityId: string): Promise<MatchResponse[]> {
    const matches = await this.repository.findPlayerMatches(entityId);
    let data: MatchResponse[] = [];
    for (let index = 0; index < matches.length; index++) {
      data.push(await this.convertMatchModelToResponse(matches[index]));
    }

    return data;
  }

  @Get("/{entityId}")
  @Security("jwt")
  async getById(@Path() entityId: string): Promise<MatchResponse> {
    const match = await this.repository.findByIdOrThrow(entityId, "Match");
    return await this.convertMatchModelToResponse(match);
  }

  @Post("/")
  @Security("jwt")
  async createMatch(@Body() createMatch: CreateMatchRequest): Promise<string> {
    const players = [...splitIds(createMatch.firstTeam), ...splitIds(createMatch.secondTeam)];
    if (!isAdmin(this.user) && !players.includes(this.user.id)) {
      throw new ForbiddenError("You can only record matches you played in");
    }
    return await this.repository.createMatch(createMatch);
  }

  @Delete("/{entityId}")
  @Security("jwt")
  async deleteMatch(@Path() entityId: string): Promise<string> {
    this.assertPlayedIn(await this.repository.findByIdOrThrow(entityId, "Match"));
    return await this.repository.deleteEntity(entityId);
  }

  @Patch("/{entityId}")
  @Security("jwt")
  async updateMatch(@Body() updateRequest: UpdateMatchRequest, @Path() entityId: string): Promise<string> {
    this.assertPlayedIn(await this.repository.findByIdOrThrow(entityId, "Match"));
    return await this.repository.updateMatch(entityId, updateRequest);
  }

  private async convertMatchModelToResponse(match: Match): Promise<MatchResponse> {
    const court = await this.courtRepository.findByEntityID(match.court);
    const club = await this.clubRepository.findByEntityID(court.club);

    let firstTeamPlayers = await Promise.all(
      match.firstTeam.map(
        async (playerEntityID) => (await this.playerRepository.findByEntityID(playerEntityID)).nickname
      )
    );

    let secondTeamPlayers = await Promise.all(
      match.secondTeam.map(
        async (playerEntityID) => (await this.playerRepository.findByEntityID(playerEntityID)).nickname
      )
    );

    return {
      entityId: match.entityId,
      firstTeam: firstTeamPlayers,
      secondTeam: secondTeamPlayers,
      result: match.result,
      date: match.date,
      clubName: club.name,
      courtName: court.name,
      courtSurface: court.surface,
    } as MatchResponse;
  }

  // Only the players in a match, or an ADMIN, can change or remove it.
  private assertPlayedIn(match: Match) {
    const players = [...(match.firstTeam ?? []), ...(match.secondTeam ?? [])];
    if (!isAdmin(this.user) && !players.includes(this.user.id)) {
      throw new ForbiddenError();
    }
  }
}
