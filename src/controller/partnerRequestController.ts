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
import { partnerRequestExample, partnerRequestPageExample } from "../http/examples";
import { PartnerRequest } from "../entities/partnerRequest";
import RequestStatus from "../enums/requestStatus";
import BookingStatus from "../enums/bookingStatus";
import PlayerLevel from "../enums/playerLevel";
import AppError, { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import BookingRepository from "../repositories/bookingRepository";
import PartnerRequestRepository from "../repositories/partnerRequestRepository";
import CreatePartnerRequest from "../requests/createPartnerRequest";
import UpdatePartnerRequest from "../requests/updatePartnerRequest";
import { ErrorBody } from "../responses/common";
import PartnerRequestResponse from "../responses/partnerRequestResponse";
import { assertSelfOrAdmin } from "../services/access";
import { now } from "../services/clock";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createPartnerRequestBody, updatePartnerRequestBody } from "../validation/requests";

// Players who hold a booking and are looking for someone to play with.
@Tags("Partner requests")
@Route("partner-requests")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class PartnerRequestController {
  private repository = new PartnerRequestRepository();
  private bookingRepository = new BookingRepository();
  private mapper = new Mapper();

  @Example(partnerRequestExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Response<ErrorBody>(409, "BOOKING_IN_PAST")
  @SuccessResponse(201, "Created")
  @Middlewares(validate({ body: createPartnerRequestBody }))
  @Post("/")
  async createPartnerRequest(
    @Request() req: ExRequest,
    @Body() createRequest: CreatePartnerRequest
  ): Promise<PartnerRequestResponse> {
    const user = currentUser(req);
    const booking = await this.assertOwnsBooking(user, createRequest.bookingId);
    const id = await this.repository.createPartnerRequest(createRequest, user.id, booking.startsAt);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  /**
   * Requests that are still looking for players, or already full, soonest booking first. Requests whose booking
   * has started are not listed.
   * @param status OPEN (default) or CLOSED.
   * @param level Requests for this level, and those open to any level.
   * @param from Only bookings that start at or after this time, ISO 8601 in UTC.
   * @param to Only bookings that start before this time, ISO 8601 in UTC.
   * @param doubles true for doubles (3 more players), false for singles or a pair.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(partnerRequestPageExample)
  @Get("/")
  async getPartnerRequests(
    @Query() status?: RequestStatus,
    @Query() level?: PlayerLevel,
    @Query() from?: string,
    @Query() to?: string,
    @Query() doubles?: boolean,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<PartnerRequestResponse>> {
    const { entities, nextCursor } = await this.repository.findPartnerRequestsPage(
      {
        status: status ?? RequestStatus.OPEN,
        level,
        from: this.readTime(from, "from"),
        to: this.readTime(to, "to"),
        doubles,
        startsAfter: now().getTime(),
      },
      { limit, cursor }
    );
    const items = await Promise.all(entities.map((request) => this.toResponseOrNull(request)));
    return { items: items.filter((item): item is PartnerRequestResponse => item !== null), nextCursor };
  }

  @Example(partnerRequestExample)
  @Get("/{id}")
  async getPartnerRequest(@Path() id: string): Promise<PartnerRequestResponse> {
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  @Example(partnerRequestExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Response<ErrorBody>(409, "BOOKING_IN_PAST")
  @Middlewares(validate({ body: updatePartnerRequestBody }))
  @Patch("/{id}")
  async updatePartnerRequest(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdatePartnerRequest
  ): Promise<PartnerRequestResponse> {
    const user = currentUser(req);
    const request = await this.repository.findByIdOrThrow(id, "Request");
    assertSelfOrAdmin(user, request.playerId);
    const booking = updateRequest.bookingId ? await this.assertOwnsBooking(user, updateRequest.bookingId) : undefined;
    await this.repository.updatePartnerRequest(id, updateRequest, booking?.startsAt);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  @Delete("/{id}")
  async deletePartnerRequest(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    assertSelfOrAdmin(currentUser(req), (await this.repository.findByIdOrThrow(id, "Request")).playerId);
    await this.repository.deleteEntity(id);
  }

  // The logged-in player takes one of the open places. A full request answers 409.
  @Example(partnerRequestExample)
  @Response<ErrorBody>(409, "REQUEST_FULL")
  @Response<ErrorBody>(409, "ALREADY_JOINED")
  @Response<ErrorBody>(409, "BOOKING_IN_PAST")
  @Post("/{id}/join")
  async joinPartnerRequest(@Request() req: ExRequest, @Path() id: string): Promise<PartnerRequestResponse> {
    const user = currentUser(req);
    const request = await this.repository.findByIdOrThrow(id, "Request");
    if (request.playerId === user.id) {
      throw new ForbiddenError("You cannot join your own request");
    }
    if (request.startsAt <= now().getTime()) {
      throw new AppError(409, ErrorCode.BOOKING_IN_PAST, "This booking has already started");
    }
    await this.repository.join(id, user.id);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  // Gives the place back, so someone else can take it.
  @Example(partnerRequestExample)
  @Response<ErrorBody>(409, "NOT_JOINED")
  @Post("/{id}/leave")
  async leavePartnerRequest(@Request() req: ExRequest, @Path() id: string): Promise<PartnerRequestResponse> {
    await this.repository.findByIdOrThrow(id, "Request");
    await this.repository.leave(id, currentUser(req).id);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  private readTime(value: string | undefined, field: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      throw new ValidationError("Validation failed", { [field]: ["Must be an ISO 8601 date and time"] });
    }
    return time;
  }

  // Only the person who holds a booking can look for a partner for it.
  private async assertOwnsBooking(user: AuthUser, bookingId: string) {
    const booking = await this.bookingRepository.findByIdOrThrow(bookingId, "Booking");
    if (booking.player !== user.id) {
      throw new ForbiddenError("You can only look for a partner for your own booking");
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError("This booking is cancelled");
    }
    if (booking.startsAt.getTime() <= now().getTime()) {
      throw new AppError(409, ErrorCode.BOOKING_IN_PAST, "This booking has already started");
    }
    return booking;
  }

  private async toResponseOrNull(request: PartnerRequest): Promise<PartnerRequestResponse | null> {
    const booking = await this.bookingRepository.findByEntityID(request.bookingId);
    if (booking.uuid == null || booking.deleted) {
      return null;
    }
    return await this.mapper.partnerRequest(request, booking);
  }

  private async toResponse(request: PartnerRequest): Promise<PartnerRequestResponse> {
    const response = await this.toResponseOrNull(request);
    if (!response) {
      throw new NotFoundError("Booking not found");
    }
    return response;
  }
}
