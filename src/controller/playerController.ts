import { Request as ExRequest } from "express";
import {
  Body,
  Delete,
  Example,
  Get,
  Middlewares,
  Patch,
  Path,
  Query,
  Request,
  Response,
  Route,
  Security,
  Tags,
} from "tsoa";
import { playerExample, playerPageExample, statsExample } from "../http/examples";
import PlayerLevel from "../enums/playerLevel";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import PlayerRepository from "../repositories/playerRepository";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import { ErrorBody } from "../responses/common";
import PlayerResponse from "../responses/playerResponse";
import StatsResponse from "../responses/statsResponse";
import { assertSelfOrAdmin } from "../services/access";
import AccountService from "../services/accountService";
import Mapper from "../services/mappers";
import StatsService from "../services/statsService";
import { updatePlayerBody } from "../validation/auth";

@Tags("Players")
@Route("players")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class PlayerController {
  private repository = new PlayerRepository();
  private mapper = new Mapper();
  private accountService = new AccountService();

  /**
   * Players, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(playerPageExample)
  @Get("/")
  async getPlayers(
    @Request() req: ExRequest,
    @Query() city?: string,
    @Query() level?: PlayerLevel,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<PlayerResponse>> {
    const user = currentUser(req);
    const { entities, nextCursor } = await this.repository.findPlayersPage({ city, level }, { limit, cursor });
    return { items: entities.map((player) => this.mapper.player(player, user)), nextCursor };
  }

  /** Wins, losses, sets and games over the player's confirmed matches. */
  @Example(statsExample)
  @Get("/{id}/stats")
  async getPlayerStats(@Path() id: string): Promise<StatsResponse> {
    await this.repository.findByIdOrThrow(id, "Player");
    return await new StatsService().get(id);
  }

  @Example(playerExample)
  @Get("/{id}")
  async getPlayer(@Request() req: ExRequest, @Path() id: string): Promise<PlayerResponse> {
    return this.mapper.player(await this.repository.findByIdOrThrow(id, "Player"), currentUser(req));
  }

  @Example(playerExample)
  @Middlewares(validate({ body: updatePlayerBody }))
  @Patch("/{id}")
  async updatePlayer(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdatePlayerRequest
  ): Promise<PlayerResponse> {
    const user = currentUser(req);
    assertSelfOrAdmin(user, id);
    await this.repository.updatePlayer(id, updateRequest);
    return this.mapper.player(await this.repository.findByIdOrThrow(id, "Player"), user);
  }

  @Delete("/{id}")
  async deletePlayer(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    assertSelfOrAdmin(currentUser(req), id);
    await this.accountService.deleteAccount(id);
  }
}
