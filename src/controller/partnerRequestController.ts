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
import { ForbiddenError, NotFoundError } from "../errors/appError";
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
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createPartnerRequestBody, updatePartnerRequestBody } from "../validation/requests";

// Players who hold a booking and are looking for someone to play with.
@Tags("Partner requests")
@Route("partner-requests")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class PartnerRequestController {
  private repository = new PartnerRequestRepository();
  private bookingRepository = new BookingRepository();
  private mapper = new Mapper();

  @Example(partnerRequestExample)
  @SuccessResponse(201, "Created")
  @Middlewares(validate({ body: createPartnerRequestBody }))
  @Post("/")
  async createPartnerRequest(
    @Request() req: ExRequest,
    @Body() createRequest: CreatePartnerRequest
  ): Promise<PartnerRequestResponse> {
    const user = currentUser(req);
    await this.assertOwnsBooking(user, createRequest.bookingId);
    const id = await this.repository.createPartnerRequest(createRequest, user.id);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  /**
   * Requests that are still looking for players, or already full. Oldest first.
   * @param status OPEN (default) or CLOSED.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(partnerRequestPageExample)
  @Get("/")
  async getPartnerRequests(
    @Query() status?: RequestStatus,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<PartnerRequestResponse>> {
    const { entities, nextCursor } = await this.repository.findByStatusPage(status ?? RequestStatus.OPEN, {
      limit,
      cursor,
    });
    const items = await Promise.all(entities.map((request) => this.toResponseOrNull(request)));
    return { items: items.filter((item): item is PartnerRequestResponse => item !== null), nextCursor };
  }

  @Example(partnerRequestExample)
  @Get("/{id}")
  async getPartnerRequest(@Path() id: string): Promise<PartnerRequestResponse> {
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  @Example(partnerRequestExample)
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
    if (updateRequest.bookingId) {
      await this.assertOwnsBooking(user, updateRequest.bookingId);
    }
    await this.repository.updatePartnerRequest(id, updateRequest);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  @Delete("/{id}")
  async deletePartnerRequest(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    assertSelfOrAdmin(currentUser(req), (await this.repository.findByIdOrThrow(id, "Request")).playerId);
    await this.repository.deleteEntity(id);
  }

  // The logged-in player takes one of the open places. A full request answers 409.
  @Example(partnerRequestExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Post("/{id}/join")
  async joinPartnerRequest(@Request() req: ExRequest, @Path() id: string): Promise<PartnerRequestResponse> {
    const user = currentUser(req);
    const request = await this.repository.findByIdOrThrow(id, "Request");
    if (request.playerId === user.id) {
      throw new ForbiddenError("You cannot join your own request");
    }
    await this.repository.join(id, user.id);
    return await this.toResponse(await this.repository.findByIdOrThrow(id, "Request"));
  }

  // Only the person who holds a booking can look for a partner for it.
  private async assertOwnsBooking(user: AuthUser, bookingId: string) {
    const booking = await this.bookingRepository.findByIdOrThrow(bookingId, "Booking");
    if (booking.player !== user.id) {
      throw new ForbiddenError("You can only look for a partner for your own booking");
    }
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
