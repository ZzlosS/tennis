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
import { bookingExample, bookingPageExample } from "../http/examples";
import { COURT_NO_CLUB } from "../consts";
import { Booking } from "../entities/booking";
import Role from "../enums/role";
import { ForbiddenError, ValidationError } from "../errors/appError";
import { Page, pageOfArray } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import PartnerRequestRepository from "../repositories/partnerRequestRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import BookingResponse from "../responses/bookingResponse";
import { ErrorBody } from "../responses/common";
import { isAdmin, isClubAdmin } from "../services/access";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createBookingBody, updateBookingBody } from "../validation/bookings";

const HOUR_MS = 3_600_000;
const MAX_HOURS = 24;

@Tags("Bookings")
@Route("bookings")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class BookingController {
  private repository = new BookingRepository();
  private courtRepository = new CourtRepository();
  private clubRepository = new ClubRepository();
  private partnerRequests = new PartnerRequestRepository();
  private mapper = new Mapper();

  // The booking belongs to the logged-in user and the price always comes from the court.
  @Example(bookingExample)
  @SuccessResponse(201, "Created")
  @Middlewares(validate({ body: createBookingBody }))
  @Post("/")
  async createBooking(
    @Request() req: ExRequest,
    @Body() createBooking: BookingCreateRequest
  ): Promise<BookingResponse> {
    const court = await this.courtRepository.findByIdOrThrow(createBooking.courtId, "Court");
    const hours = (Date.parse(createBooking.endsAt) - Date.parse(createBooking.startsAt)) / HOUR_MS;

    const id = await this.repository.createBooking(
      createBooking,
      currentUser(req).id,
      hours * court.pricePerHourMinor,
      court.currency
    );
    return await this.mapper.booking(await this.repository.findByIdOrThrow(id, "Booking"));
  }

  /**
   * Players see their own bookings, club admins also see their clubs' bookings, ADMINs see all. Oldest first.
   * @param from Only bookings that start at or after this time.
   * @param to Only bookings that end at or before this time.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(bookingPageExample)
  @Get("/")
  async getBookings(
    @Request() req: ExRequest,
    @Query() courtId?: string,
    @Query() playerId?: string,
    @Query() from?: Date,
    @Query() to?: Date,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<BookingResponse>> {
    const user = currentUser(req);
    if (user.role === Role.PLAYER) {
      if (playerId && playerId !== user.id) {
        throw new ForbiddenError();
      }
      playerId = user.id;
    }
    const filters = { courtId, playerId, from, to };

    if (user.role === Role.CLUB_ADMIN) {
      // Which bookings a club admin may see depends on the court's club, so the list is cut down in code first.
      const visible: Booking[] = [];
      for (const booking of await this.repository.findBookings(filters)) {
        if (await this.canAccess(user, booking)) {
          visible.push(booking);
        }
      }
      return await pageOfArray(visible, { limit, cursor }, (booking) => this.mapper.booking(booking));
    }

    const { entities, nextCursor } = await this.repository.findBookingsPage(filters, { limit, cursor });
    return { items: await Promise.all(entities.map((booking) => this.mapper.booking(booking))), nextCursor };
  }

  @Example(bookingExample)
  @Get("/{id}")
  async getBooking(@Request() req: ExRequest, @Path() id: string): Promise<BookingResponse> {
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    await this.assertCanAccess(currentUser(req), booking);
    return await this.mapper.booking(booking);
  }

  @Example(bookingExample)
  @Middlewares(validate({ body: updateBookingBody }))
  @Patch("/{id}")
  async updateBooking(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateBookingRequest
  ): Promise<BookingResponse> {
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    await this.assertCanAccess(currentUser(req), booking);

    // A new court or new hours means a new price.
    let price: { totalPriceMinor: number; currency: string } | undefined;
    if (updateRequest.courtId || updateRequest.startsAt || updateRequest.endsAt) {
      const court = await this.courtRepository.findByIdOrThrow(updateRequest.courtId ?? booking.court, "Court");
      const startsAt = updateRequest.startsAt ? new Date(updateRequest.startsAt) : booking.startsAt;
      const endsAt = updateRequest.endsAt ? new Date(updateRequest.endsAt) : booking.endsAt;
      const hours = (endsAt.getTime() - startsAt.getTime()) / HOUR_MS;
      if (hours <= 0 || hours > MAX_HOURS) {
        throw new ValidationError("Validation failed", {
          endsAt: [`A booking must end after it starts and last at most ${MAX_HOURS} hours`],
        });
      }
      price = { totalPriceMinor: hours * court.pricePerHourMinor, currency: court.currency };
    }

    await this.repository.updateBooking(id, updateRequest, price);
    return await this.mapper.booking(await this.repository.findByIdOrThrow(id, "Booking"));
  }

  @Delete("/{id}")
  async deleteBooking(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    await this.assertCanAccess(currentUser(req), await this.repository.findByIdOrThrow(id, "Booking"));
    await this.repository.deleteEntity(id);
    await this.partnerRequests.deleteForBooking(id);
  }

  // The booking's owner, an admin of the court's club, or an ADMIN.
  private async canAccess(user: AuthUser, booking: Booking): Promise<boolean> {
    if (isAdmin(user) || booking.player === user.id) {
      return true;
    }
    const court = await this.courtRepository.findByEntityID(booking.court);
    if (!court.club || court.club === COURT_NO_CLUB) {
      return false;
    }
    return isClubAdmin(user, await this.clubRepository.findByEntityID(court.club));
  }

  private async assertCanAccess(user: AuthUser, booking: Booking) {
    if (!(await this.canAccess(user, booking))) {
      throw new ForbiddenError();
    }
  }
}
