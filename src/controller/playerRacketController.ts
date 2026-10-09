import { Request as ExRequest } from "express";
import {
  Delete,
  Example,
  Get,
  Path,
  Put,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { racketPageExample } from "../http/examples";
import { Page, pageOfArray } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { ErrorBody } from "../responses/common";
import RacketResponse from "../responses/racketResponse";
import { assertSelfOrAdmin } from "../services/access";
import Mapper from "../services/mappers";

// The rackets a player owns, picked from the shared catalog (see RacketController).
@Tags("Players")
@Route("players/{playerId}/rackets")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class PlayerRacketController {
  private players = new PlayerRepository();
  private rackets = new RacketRepository();
  private mapper = new Mapper();

  /**
   * A player's rackets.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(racketPageExample)
  @Get("/")
  async getPlayerRackets(
    @Path() playerId: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<RacketResponse>> {
    const player = await this.players.findByIdOrThrow(playerId, "Player");
    const rackets = await this.rackets.getUserRackets(player.rackets ?? []);
    return await pageOfArray(rackets, { limit, cursor }, (racket) => this.mapper.racket(racket));
  }

  // Adding a racket the player already has changes nothing.
  @SuccessResponse(204, "Added")
  @Put("/{racketId}")
  async addRacket(@Request() req: ExRequest, @Path() playerId: string, @Path() racketId: string): Promise<void> {
    assertSelfOrAdmin(currentUser(req), playerId);
    const player = await this.players.findByIdOrThrow(playerId, "Player");
    await this.rackets.findByIdOrThrow(racketId, "Racket");
    await this.players.assignRacketToPlayer(player, racketId);
  }

  @Delete("/{racketId}")
  async removeRacket(@Request() req: ExRequest, @Path() playerId: string, @Path() racketId: string): Promise<void> {
    assertSelfOrAdmin(currentUser(req), playerId);
    const player = await this.players.findByIdOrThrow(playerId, "Player");
    await this.players.removeRacketFromPlayer(player, racketId);
  }
}
