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
import MatchStatus from "../enums/matchStatus";
import { ConflictError, ForbiddenError, ValidationError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
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
import StatsService from "../services/statsService";
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
  private stats = new StatsService();

  /**
   * Matches, oldest first.
   * @param playerId Only matches this player played in.
   * @param status Only matches in this status.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(matchPageExample)
  @Get("/")
  async getMatches(
    @Query() playerId?: string,
    @Query() status?: MatchStatus,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<MatchResponse>> {
    if (playerId) {
      return await pageOfArray(
        await this.repository.findPlayerMatches(playerId, { status }),
        { limit, cursor },
        (match) => this.mapper.match(match)
      );
    }
    const { entities, nextCursor } = await this.repository.findMatchesPage(status, { limit, cursor });
    return { items: await Promise.all(entities.map((match) => this.mapper.match(match))), nextCursor };
  }

  @Example(matchExample)
  @Get("/{id}")
  async getMatch(@Path() id: string): Promise<MatchResponse> {
    return await this.mapper.match(await this.repository.findByIdOrThrow(id, "Match"));
  }

  /**
   * Records a match. The other team has to confirm the score before it counts; an ADMIN who did not play can
   * record a match as already confirmed.
   */
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

    const confirmedByAdmin = isAdmin(user) && !players.includes(user.id);
    const id = await this.repository.createMatch(
      createMatch,
      user.id,
      confirmedByAdmin ? MatchStatus.CONFIRMED : MatchStatus.PENDING
    );
    const match = await this.repository.findByIdOrThrow(id, "Match");
    if (confirmedByAdmin) {
      await this.stats.apply(match, 1);
    }
    return await this.mapper.match(match);
  }

  /**
   * Changes a match. The score then needs the other team's confirmation again. A confirmed match can only be
   * changed by an ADMIN.
   */
  @Example(matchExample)
  @Response<ErrorBody>(409, "MATCH_NOT_PENDING")
  @Middlewares(validate({ body: updateMatchBody }))
  @Patch("/{id}")
  async updateMatch(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateMatchRequest
  ): Promise<MatchResponse> {
    const match = await this.repository.findByIdOrThrow(id, "Match");
    const user = currentUser(req);
    this.assertPlayedIn(user, match);
    const wasConfirmed = match.status === MatchStatus.CONFIRMED;
    if (wasConfirmed && !isAdmin(user)) {
      throw new ConflictError("A confirmed match can no longer be changed", ErrorCode.MATCH_NOT_PENDING);
    }

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

    // The stats follow a confirmed match that an ADMIN corrects.
    if (wasConfirmed) {
      await this.stats.apply(match, -1);
    }
    await this.repository.updateMatch(id, updateRequest, { id: user.id, keepStatus: wasConfirmed });
    const updated = await this.repository.findByIdOrThrow(id, "Match");
    if (wasConfirmed) {
      await this.stats.apply(updated, 1);
    }
    return await this.mapper.match(updated);
  }

  /** The other team agrees with the score; from now on the match counts for the stats. */
  @Example(matchExample)
  @Response<ErrorBody>(409, "MATCH_NOT_PENDING")
  @Post("/{id}/confirm")
  async confirmMatch(@Request() req: ExRequest, @Path() id: string): Promise<MatchResponse> {
    const match = await this.repository.findByIdOrThrow(id, "Match");
    this.assertCanAnswer(currentUser(req), match);
    // Only one answer can move a pending match, so the stats are never counted twice.
    if (!(await this.repository.moveStatus(id, MatchStatus.PENDING, MatchStatus.CONFIRMED))) {
      throw new ConflictError("This match is not waiting for an answer", ErrorCode.MATCH_NOT_PENDING);
    }
    const confirmed = await this.repository.findByIdOrThrow(id, "Match");
    await this.stats.apply(confirmed, 1);
    return await this.mapper.match(confirmed);
  }

  /** The other team does not agree with the score. The player who entered it can correct it, which asks again. */
  @Example(matchExample)
  @Response<ErrorBody>(409, "MATCH_NOT_PENDING")
  @Post("/{id}/dispute")
  async disputeMatch(@Request() req: ExRequest, @Path() id: string): Promise<MatchResponse> {
    const match = await this.repository.findByIdOrThrow(id, "Match");
    this.assertCanAnswer(currentUser(req), match);
    if (!(await this.repository.moveStatus(id, MatchStatus.PENDING, MatchStatus.DISPUTED))) {
      throw new ConflictError("This match is not waiting for an answer", ErrorCode.MATCH_NOT_PENDING);
    }
    return await this.mapper.match(await this.repository.findByIdOrThrow(id, "Match"));
  }

  /** A confirmed match can only be removed by an ADMIN, and then it no longer counts for the stats. */
  @Response<ErrorBody>(409, "MATCH_NOT_PENDING")
  @Delete("/{id}")
  async deleteMatch(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    const user = currentUser(req);
    const match = await this.repository.findByIdOrThrow(id, "Match");
    this.assertPlayedIn(user, match);
    if (match.status === MatchStatus.CONFIRMED) {
      if (!isAdmin(user)) {
        throw new ConflictError("A confirmed match can no longer be removed", ErrorCode.MATCH_NOT_PENDING);
      }
      await this.stats.apply(match, -1);
    }
    await this.repository.deleteEntity(id);
  }

  // Only a player of the team that did not enter the score can confirm or dispute it.
  private assertCanAnswer(user: AuthUser, match: Match) {
    const inFirst = (match.firstTeam ?? []).includes(user.id);
    const inSecond = (match.secondTeam ?? []).includes(user.id);
    if (!inFirst && !inSecond) {
      throw new ForbiddenError();
    }
    const enteredByFirst = (match.firstTeam ?? []).includes(match.createdBy);
    const enteredBySecond = (match.secondTeam ?? []).includes(match.createdBy);
    if ((inFirst && enteredByFirst) || (inSecond && enteredBySecond)) {
      throw new ForbiddenError("The other team has to answer");
    }
  }

  // Only the players in a match, or an ADMIN, can change or remove it.
  private assertPlayedIn(user: AuthUser, match: Match) {
    const players = [...(match.firstTeam ?? []), ...(match.secondTeam ?? [])];
    if (!isAdmin(user) && !players.includes(user.id)) {
      throw new ForbiddenError();
    }
  }
}
