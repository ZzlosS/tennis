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
import BookingStatus from "../enums/bookingStatus";
import Role from "../enums/role";
import { ConflictError, ForbiddenError } from "../errors/appError";
import { Page, pageOfArray } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import BookingResponse from "../responses/bookingResponse";
import { ErrorBody } from "../responses/common";
import { isAdmin, isClubAdmin } from "../services/access";
import BookingService from "../services/bookingService";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createBookingBody, updateBookingBody } from "../validation/bookings";

@Tags("Bookings")
@Route("bookings")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class BookingController {
  private repository = new BookingRepository();
  private courtRepository = new CourtRepository();
  private clubRepository = new ClubRepository();
  private service = new BookingService();
  private mapper = new Mapper();

  /**
   * The booking belongs to the logged-in user and the price always comes from the court. All the hours are taken or none:
   * if one is already booked the answer is 409 SLOT_TAKEN and `fields.slots` lists the hours that clash.
   * `MONTH` makes four weekly bookings and `SEASON` weekly bookings up to the club's season end; they share a `seriesId`
   * and the first one is returned. Times must be on the hour, in the future, inside the court's opening hours,
   * and at most 90 days ahead.
   */
  @Example(bookingExample)
  @SuccessResponse(201, "Created")
  @Response<ErrorBody>(409, "SLOT_TAKEN, COURT_CLOSED")
  @Middlewares(validate({ body: createBookingBody }))
  @Post("/")
  async createBooking(
    @Request() req: ExRequest,
    @Body() createBooking: BookingCreateRequest
  ): Promise<BookingResponse> {
    const [first] = await this.service.create(currentUser(req).id, createBooking);
    return await this.mapper.booking(await this.repository.findByIdOrThrow(first.entityId, "Booking"));
  }

  /**
   * Players see their own bookings, club admins also see their clubs' bookings, ADMINs see all. Oldest first.
   * Cancelled bookings are left out unless `status` is CANCELLED.
   * @param seriesId Only the bookings made together by one weekly repeat.
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
    @Query() seriesId?: string,
    @Query() status?: BookingStatus,
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
    const filters = { courtId, playerId, seriesId, status, from, to };

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
  @Response<ErrorBody>(409, "SLOT_TAKEN, COURT_CLOSED")
  @Middlewares(validate({ body: updateBookingBody }))
  @Patch("/{id}")
  async updateBooking(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateBookingRequest
  ): Promise<BookingResponse> {
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    await this.assertCanAccess(currentUser(req), booking);

    // A new court or new hours means a new price, and the old hours are given back.
    await this.service.reschedule(booking, updateRequest);
    return await this.mapper.booking(await this.repository.findByIdOrThrow(id, "Booking"));
  }

  /**
   * Cancels a booking and frees its hours. A player can cancel their own booking until the club's cut-off
   * (24 hours before the start unless the club says otherwise); club admins, the owner of a court without a club
   * and ADMINs can always cancel. Cancelling twice does nothing.
   * @param series Also cancel every later booking made together with this one.
   */
  @Example(bookingExample)
  @Response<ErrorBody>(409, "CANCEL_TOO_LATE")
  @Post("/{id}/cancel")
  async cancelBooking(
    @Request() req: ExRequest,
    @Path() id: string,
    @Query() series?: boolean
  ): Promise<BookingResponse> {
    const user = currentUser(req);
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    await this.assertCanAccess(user, booking);
    await this.service.cancel(user, booking, series === true);
    return await this.mapper.booking(await this.repository.findByIdOrThrow(id, "Booking"));
  }

  /**
   * Notes that the player paid at the club. This is only a note for the club's books; the app takes no payments.
   * For the club's admins, the owner of a court without a club and ADMINs. Marking twice does nothing.
   */
  @Example(bookingExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Post("/{id}/paid")
  async markPaid(@Request() req: ExRequest, @Path() id: string): Promise<BookingResponse> {
    return await this.setPaid(currentUser(req), id, true);
  }

  /** Takes the paid note off again. */
  @Example(bookingExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Delete("/{id}/paid")
  async unmarkPaid(@Request() req: ExRequest, @Path() id: string): Promise<BookingResponse> {
    return await this.setPaid(currentUser(req), id, false);
  }

  private async setPaid(user: AuthUser, id: string, paid: boolean): Promise<BookingResponse> {
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    const court = await this.courtRepository.findByEntityID(booking.court);
    if (!(await this.service.canManage(user, court))) {
      throw new ForbiddenError();
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictError("Only a confirmed booking can be marked as paid");
    }
    if (paid !== Boolean(booking.paidAt)) {
      await this.repository.setPaid(booking, paid);
    }
    return await this.mapper.booking(await this.repository.findByIdOrThrow(id, "Booking"));
  }

  @Delete("/{id}")
  async deleteBooking(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    const booking = await this.repository.findByIdOrThrow(id, "Booking");
    await this.assertCanAccess(currentUser(req), booking);
    await this.service.remove(booking);
  }

  // The booking's owner, an admin of the court's club, or an ADMIN.
  private async canAccess(user: AuthUser, booking: Booking): Promise<boolean> {
    if (isAdmin(user) || booking.player === user.id) {
      return true;
    }
    const court = await this.courtRepository.findByEntityID(booking.court);
    if (!court.club || court.club === COURT_NO_CLUB) {
      // The owner of a court without a club sees and can cancel the bookings made on it.
      return !!court.ownerId && court.ownerId === user.id;
    }
    return isClubAdmin(user, await this.clubRepository.findByEntityID(court.club));
  }

  private async assertCanAccess(user: AuthUser, booking: Booking) {
    if (!(await this.canAccess(user, booking))) {
      throw new ForbiddenError();
    }
  }
}
