import { EnemyRequest } from "../entities/requestEnemy";
import BookingRepository from "../repositories/bookingRepository";
import PlayerRepository from "../repositories/playerRepository";
import EnemyRequestRepository from "../repositories/requestRepository";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import { Tags, Route, Get, Path, Post, Body, Delete, Patch, Security } from "tsoa";
import EnemyRequestResponse from "../responses/enemyRequestResponse";
import CourtRepository from "../repositories/courtRepository";
import AcceptEnemyRequest from "../requests/acceptEnemyRequest";
import UpdateEnemyRequest from "../requests/updateEnemyRequest";
import { ForbiddenError } from "../errors/appError";
import { assertSelfOrAdmin } from "../services/access";
import { AuthUser } from "../services/tokenService";

@Tags("Requests")
@Route("requests")
export default class EnemyRequestController {
  repository: EnemyRequestRepository;
  playerRepository: PlayerRepository;
  bookingRepository: BookingRepository;
  courtRepository: CourtRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.user = user;
    this.repository = new EnemyRequestRepository();
    this.bookingRepository = new BookingRepository();
    this.playerRepository = new PlayerRepository();
    this.playerRepository = new PlayerRepository();
    this.courtRepository = new CourtRepository();
  }

  @Post("/")
  @Security("jwt")
  async createRequest(@Body() createRequest: CreateEnemyRequest) {
    await this.assertOwnsBooking(createRequest.bookingEntityID);
    return await this.repository.createEnemyRequest(createRequest, this.user.id);
  }

  @Post("/accept")
  @Security("jwt")
  async acceptRequest(@Body() acceptRequest: AcceptEnemyRequest) {
    const request = await this.repository.findByIdOrThrow(acceptRequest.requestEntityID, "Request");
    if (request.playerEntityID === this.user.id) {
      throw new ForbiddenError("You cannot accept your own request");
    }
    return await this.repository.enemyRequestAccepted(acceptRequest.requestEntityID, this.user.id);
  }

  @Get("/")
  @Security("jwt")
  async getActiveRequests() {
    const requests = await this.repository.allActiveEnemyRequests();
    let data: EnemyRequestResponse[] = [];
    for (let index = 0; index < requests.length; index++) {
      data.push(await this.convertMatchModelToResponse(requests[index]));
    }

    return data;
  }

  @Get("/inactive")
  @Security("jwt")
  async getInactiveRequests() {
    const requests = await this.repository.allInactiveEnemyRequests();
    let data: EnemyRequestResponse[] = [];
    for (let index = 0; index < requests.length; index++) {
      data.push(await this.convertMatchModelToResponse(requests[index]));
    }

    return data;
  }

  private async convertMatchModelToResponse(enemyRequest: EnemyRequest): Promise<EnemyRequestResponse> {
    const booking = await this.bookingRepository.findByEntityID(enemyRequest.bookingEntityID);
    const player = await this.playerRepository.findByEntityID(enemyRequest.playerEntityID);
    const court = await this.courtRepository.findByEntityID(booking.court);
    const acceptedPlayerNicnames = await Promise.all(
      enemyRequest.acceptedBy.map(
        async (playerEntityID) => (await this.playerRepository.findByEntityID(playerEntityID)).nickname
      )
    );

    return {
      entityId: enemyRequest.entityId,
      bookingEntityID: enemyRequest.bookingEntityID,
      courtEntityId: booking.court,
      date: booking.date,
      totalPrice: booking.totalPrice,
      from: booking.from,
      to: booking.to,
      playerNickname: player.nickname,
      numberOfPlayersNeeded: enemyRequest.numberOfPlayersNeeded,
      acceptedPlayerNicnames: acceptedPlayerNicnames,
      active: enemyRequest.active,
      courtName: court.name,
      courtSurface: court.surface,
    } as EnemyRequestResponse;
  }

  @Delete("/{entityId}")
  @Security("jwt")
  async deleteEnemyRequest(@Path() entityId: string): Promise<string> {
    assertSelfOrAdmin(this.user, (await this.repository.findByIdOrThrow(entityId, "Request")).playerEntityID);
    return await this.repository.deleteEntity(entityId);
  }

  @Get("/{entityId}")
  @Security("jwt")
  async getEnemyRequest(@Path() entityId: string): Promise<EnemyRequestResponse> {
    return await this.convertMatchModelToResponse(await this.repository.findByIdOrThrow(entityId, "Request"));
  }

  @Patch("/{entityId}")
  @Security("jwt")
  async updateEnemyRequest(@Body() updateRequest: UpdateEnemyRequest, @Path() entityId: string): Promise<string> {
    const request = await this.repository.findByIdOrThrow(entityId, "Request");
    assertSelfOrAdmin(this.user, request.playerEntityID);
    if (updateRequest.bookingEntityID) {
      await this.assertOwnsBooking(updateRequest.bookingEntityID);
    }
    return await this.repository.updateEnemyRequest(entityId, updateRequest);
  }

  // Only the person who holds a booking can look for a partner for it.
  private async assertOwnsBooking(bookingEntityID: string) {
    const booking = await this.bookingRepository.findByIdOrThrow(bookingEntityID, "Booking");
    if (booking.player !== this.user.id) {
      throw new ForbiddenError("You can only look for a partner for your own booking");
    }
  }
}
