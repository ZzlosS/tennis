import { Request as ExRequest } from "express";
import {
  Body,
  Delete,
  Example,
  Get,
  Middlewares,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { matchExample, matchPageExample } from "../http/examples";
import { Match } from "../entities/match";
import { ForbiddenError, ValidationError } from "../errors/appError";
import { Page, pageOfArray } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import CourtRepository from "../repositories/courtRepository";
import MatchRepository from "../repositories/matchRepository";
import PlayerRepository from "../repositories/playerRepository";
import CreateMatchRequest from "../requests/createMatchRequest";
import UpdateMatchRequest from "../requests/updateMatchRequest";
import { ErrorBody } from "../responses/common";
import MatchResponse from "../responses/matchResponse";
import { isAdmin } from "../services/access";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createMatchBody, updateMatchBody } from "../validation/matches";

@Tags("Matches")
@Route("matches")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class MatchController {
  private repository = new MatchRepository();
  private courtRepository = new CourtRepository();
  private playerRepository = new PlayerRepository();
  private mapper = new Mapper();

  /**
   * Matches, oldest first.
   * @param playerId Only matches this player played in.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(matchPageExample)
  @Get("/")
  async getMatches(
    @Query() playerId?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<MatchResponse>> {
    if (playerId) {
      return await pageOfArray(await this.repository.findPlayerMatches(playerId), { limit, cursor }, (match) =>
        this.mapper.match(match)
      );
    }
    const { entities, nextCursor } = await this.repository.findMatchesPage({ limit, cursor });
    return { items: await Promise.all(entities.map((match) => this.mapper.match(match))), nextCursor };
  }

  @Example(matchExample)
  @Get("/{id}")
  async getMatch(@Path() id: string): Promise<MatchResponse> {
    return await this.mapper.match(await this.repository.findByIdOrThrow(id, "Match"));
  }

  @Example(matchExample)
  @SuccessResponse(201, "Created")
  @Middlewares(validate({ body: createMatchBody }))
  @Post("/")
  async createMatch(@Request() req: ExRequest, @Body() createMatch: CreateMatchRequest): Promise<MatchResponse> {
    const user = currentUser(req);
    const players = [...createMatch.firstTeam, ...createMatch.secondTeam];
    if (!isAdmin(user) && !players.includes(user.id)) {
      throw new ForbiddenError("You can only record matches you played in");
    }
    await this.courtRepository.findByIdOrThrow(createMatch.courtId, "Court");
    await Promise.all(players.map((playerId) => this.playerRepository.findByIdOrThrow(playerId, "Player")));

    const id = await this.repository.createMatch(createMatch);
    return await this.mapper.match(await this.repository.findByIdOrThrow(id, "Match"));
  }

  @Example(matchExample)
  @Middlewares(validate({ body: updateMatchBody }))
  @Patch("/{id}")
  async updateMatch(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateMatchRequest
  ): Promise<MatchResponse> {
    const match = await this.repository.findByIdOrThrow(id, "Match");
    this.assertPlayedIn(currentUser(req), match);

    const players = [
      ...(updateRequest.firstTeam ?? match.firstTeam),
      ...(updateRequest.secondTeam ?? match.secondTeam),
    ];
    if (new Set(players).size !== players.length) {
      throw new ValidationError("Validation failed", { secondTeam: ["A player can only be on one team"] });
    }
    if (updateRequest.courtId) {
      await this.courtRepository.findByIdOrThrow(updateRequest.courtId, "Court");
    }
    await Promise.all(
      [...(updateRequest.firstTeam ?? []), ...(updateRequest.secondTeam ?? [])].map((playerId) =>
        this.playerRepository.findByIdOrThrow(playerId, "Player")
      )
    );

    await this.repository.updateMatch(id, updateRequest);
    return await this.mapper.match(await this.repository.findByIdOrThrow(id, "Match"));
  }

  @Delete("/{id}")
  async deleteMatch(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    this.assertPlayedIn(currentUser(req), await this.repository.findByIdOrThrow(id, "Match"));
    await this.repository.deleteEntity(id);
  }

  // Only the players in a match, or an ADMIN, can change or remove it.
  private assertPlayedIn(user: AuthUser, match: Match) {
    const players = [...(match.firstTeam ?? []), ...(match.secondTeam ?? [])];
    if (!isAdmin(user) && !players.includes(user.id)) {
      throw new ForbiddenError();
    }
  }
}
