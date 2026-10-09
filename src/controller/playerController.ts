import PlayerRepository from "../repositories/playerRepository";
import { Route, Get, Path, Tags, Delete, Patch, Body, Security } from "tsoa";
import PlayerLevel from "../enums/playerLevel";
import PlayersResponse from "../responses/playersResponse";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import { Player } from "../entities/player";
import { AuthUser } from "../services/tokenService";
import { assertSelfOrAdmin, isAdmin } from "../services/access";

@Tags("Players")
@Route("players")
export default class PlayerController {
  repository: PlayerRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.repository = new PlayerRepository();
    this.user = user;
  }

  @Security("jwt")
  @Get("/")
  async getAll(): Promise<PlayersResponse[]> {
    const players = await this.repository.findAll();
    return players.map((player) => this.convertPlayerModelToResponse(player));
  }

  @Security("jwt")
  @Get("/{entityId}")
  async getByEntityId(@Path() entityId: string): Promise<PlayersResponse> {
    return this.convertPlayerModelToResponse(await this.repository.findByIdOrThrow(entityId, "Player"));
  }

  @Security("jwt")
  @Get("/city/{city}")
  async getPlayersByCity(@Path() city: string): Promise<PlayersResponse[]> {
    const players = await this.repository.findPlayersByCity(city);
    return players.map((player) => this.convertPlayerModelToResponse(player));
  }

  @Security("jwt")
  @Get("/level/{level}")
  async getPlayersByLevel(@Path() level: PlayerLevel): Promise<PlayersResponse[]> {
    const players = await this.repository.findPlayersByLevel(level);
    return players.map((player) => this.convertPlayerModelToResponse(player));
  }

  @Security("jwt")
  @Delete("/{entityId}")
  async deletePlayer(@Path() entityId: string): Promise<string> {
    assertSelfOrAdmin(this.user, entityId);
    return await this.repository.deletePlayer(entityId);
  }

  @Security("jwt")
  @Patch("/{entityId}")
  async updatePlayer(@Body() updateRequest: UpdatePlayerRequest, @Path() entityId: string): Promise<string> {
    assertSelfOrAdmin(this.user, entityId);
    return await this.repository.updatePlayer(entityId, updateRequest);
  }

  // Passwords never leave the API, and an email is only shown to its owner and admins.
  private convertPlayerModelToResponse(player: Player): PlayersResponse {
    const canSeeEmail = isAdmin(this.user) || this.user.id === player.entityId;
    return {
      entityId: player.entityId,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname,
      level: player.level,
      ...(canSeeEmail ? { email: player.email } : {}),
      city: player.city,
      address: player.address,
      country: player.country,
    } as PlayersResponse;
  }
}
