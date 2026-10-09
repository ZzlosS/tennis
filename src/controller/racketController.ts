import { NotFoundError } from "../errors/appError";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { Route, Get, Post, Body, Tags, Delete, Path, Patch, Security } from "tsoa";
import RacketResponse from "../responses/racketResponse";
import AssignRacketRequest from "../requests/assignRacketRequest";
import CreateRacketRequest from "../requests/createRacketRequest";
import { Racket } from "../entities/racket";
import UpdateRacketRequest from "../requests/updateRacketRequest";
import Role from "../enums/role";
import { requireRole } from "../services/access";
import { AuthUser } from "../services/tokenService";

@Tags("Rackets")
@Route("rackets")
export default class RacketController {
  repository: RacketRepository;
  playerRepository: PlayerRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.repository = new RacketRepository();
    this.playerRepository = new PlayerRepository();
    this.user = user;
  }

  private async convertPlayerModelToResponse(racket: Racket): Promise<RacketResponse> {
    return {
      entityId: racket.entityId,
      brand: racket.brand,
      model: racket.model,
      year: racket.year,
      weight: racket.weight,
      level: racket.level,
      headSizeInch: racket.headSizeInch,
      balance: racket.balance,
      stringPattern: racket.stringPattern,
      recommendedStrings: racket.recommendedStrings,
    } as RacketResponse;
  }

  @Security("jwt")
  @Get("/")
  async getRackets(): Promise<RacketResponse[]> {
    let player = await this.playerRepository.findByIdOrThrow(this.user.id, "Player");

    if (!player.rackets || player.rackets.length === 0) {
      return [];
    }

    let rackets = await this.repository.getUserRackets(player.rackets);

    const data = rackets.map(async (racket) => {
      return await this.convertPlayerModelToResponse(racket);
    });

    return await Promise.all(data);
  }

  @Get("/all")
  @Security("jwt")
  async getAllRackets(): Promise<RacketResponse[]> {
    let rackets = await this.repository.findAll();

    if (!rackets) {
      throw new NotFoundError("No rackets at all!");
    }

    const data = rackets.map(async (racket) => {
      return await this.convertPlayerModelToResponse(racket);
    });

    return await Promise.all(data);
  }

  @Post("/")
  @Security("jwt")
  async createRacket(@Body() createRacket: CreateRacketRequest): Promise<string> {
    requireRole(this.user, Role.ADMIN);
    let racketEID = await this.repository.createRacket(createRacket);

    return racketEID;
  }

  @Post("/assign")
  @Security("jwt")
  async assignRacketToPlayer(@Body() assignRequest: AssignRacketRequest): Promise<any> {
    await this.repository.findByIdOrThrow(assignRequest.racketEid, "Racket");
    const player = await this.playerRepository.findByIdOrThrow(this.user.id, "Player");
    await this.playerRepository.assignRacketToPlayer(player, assignRequest.racketEid);

    return { assigned: true };
  }

  @Delete("/{entityId}")
  @Security("jwt")
  async deleteRacket(@Path() entityId: string): Promise<string> {
    requireRole(this.user, Role.ADMIN);
    return await this.repository.deleteEntity(entityId);
  }

  @Get("/{entityId}")
  @Security("jwt")
  async getRacket(@Path() entityId: string): Promise<RacketResponse> {
    return await this.convertPlayerModelToResponse(await this.repository.findByIdOrThrow(entityId, "Racket"));
  }

  @Patch("/{entityId}")
  @Security("jwt")
  async updateRacket(@Body() updateRequest: UpdateRacketRequest, @Path() entityId: string): Promise<string> {
    requireRole(this.user, Role.ADMIN);
    return await this.repository.updateRacket(entityId, updateRequest);
  }
}
