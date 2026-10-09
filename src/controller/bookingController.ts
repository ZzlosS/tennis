import { Tags, Route, Get, Path, Post, Body, Query, Delete, Patch, Security } from "tsoa";
import BookingRepository from "../repositories/bookingRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import CourtRepository from "../repositories/courtRepository";
import BookingFilterRequest from "../requests/bookingFilterRequest";
import ClubRepository from "../repositories/clubRepository";
import BookingResponse from "../responses/bookingResponse";
import PlayerRepository from "../repositories/playerRepository";
import { Booking } from "../entities/booking";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import { COURT_UNASSIGNED_CLUB } from "../consts";
import Role from "../enums/role";
import { ForbiddenError, ValidationError } from "../errors/appError";
import { isAdmin, isClubAdmin } from "../services/access";
import { AuthUser } from "../services/tokenService";

@Tags("Bookings")
@Route("bookings")
export default class BookingController {
  repository: BookingRepository;
  courtRepository: CourtRepository;
  clubRepository: ClubRepository;
  playerRepository: PlayerRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.repository = new BookingRepository();
    this.courtRepository = new CourtRepository();
    this.clubRepository = new ClubRepository();
    this.playerRepository = new PlayerRepository();
    this.user = user;
  }

  // The booking belongs to the logged-in user and the price always comes from the court.
  @Security("jwt")
  @Post("/")
  async createBooking(@Body() createBooking: BookingCreateRequest): Promise<string> {
    const court = await this.courtRepository.findByIdOrThrow(createBooking.court, "Court");
    const totalPrice = (createBooking.to - createBooking.from) * court.pricePerHour;

    return await this.repository.createBooking(createBooking, this.user.id, totalPrice);
  }

  // Players see their own bookings, club admins also see their clubs' bookings, ADMIN sees all.
  @Security("jwt")
  @Get("/")
  async filterBookings(
    @Query() court?: string,
    @Query() from?: number,
    @Query() to?: number,
    @Query() player?: string,
    @Query() date?: string
  ): Promise<BookingResponse[]> {
    if (this.user.role === Role.PLAYER) {
      if (player && player !== this.user.id) {
        throw new ForbiddenError();
      }
      player = this.user.id;
    }

    const bookings = await this.repository.findBookings({
      from: from,
      to: to,
      player: player,
      court: court,
      date: date,
    } as BookingFilterRequest);

    const data: BookingResponse[] = [];

    for (const booking of bookings) {
      if (this.user.role === Role.CLUB_ADMIN && !(await this.canAccess(booking))) {
        continue;
      }
      data.push(await this.convertBookingModelToResponse(booking));
    }

    return data;
  }

  @Security("jwt")
  @Delete("/{entityId}")
  async deleteBooking(@Path() entityId: string): Promise<string> {
    await this.assertCanAccess(await this.repository.findByIdOrThrow(entityId, "Booking"));
    return await this.repository.deleteEntity(entityId);
  }

  @Security("jwt")
  @Patch("/{entityId}")
  async updateBooking(@Body() updateRequest: UpdateBookingRequest, @Path() entityId: string): Promise<string> {
    const booking = await this.repository.findByIdOrThrow(entityId, "Booking");
    await this.assertCanAccess(booking);

    // A new court or new hours means a new price.
    let totalPrice: number | undefined;
    if (updateRequest.court || updateRequest.from !== undefined || updateRequest.to !== undefined) {
      const court = await this.courtRepository.findByIdOrThrow(updateRequest.court ?? booking.court, "Court");
      const from = updateRequest.from ?? booking.from;
      const to = updateRequest.to ?? booking.to;
      if (from >= to) {
        throw new ValidationError("Validation failed", { to: ["'to' must be after 'from'"] });
      }
      totalPrice = (to - from) * court.pricePerHour;
    }

    return await this.repository.updateBooking(entityId, updateRequest, totalPrice);
  }

  @Security("jwt")
  @Get("/{entityId}")
  async getByEntityId(@Path() entityId: string): Promise<BookingResponse> {
    const booking = await this.repository.findByIdOrThrow(entityId, "Booking");
    await this.assertCanAccess(booking);
    return await this.convertBookingModelToResponse(booking);
  }

  // The booking's owner, an admin of the court's club, or an ADMIN.
  private async canAccess(booking: Booking): Promise<boolean> {
    if (isAdmin(this.user) || booking.player === this.user.id) {
      return true;
    }
    const court = await this.courtRepository.findByEntityID(booking.court);
    if (court.club == null || court.club === COURT_UNASSIGNED_CLUB) {
      return false;
    }
    return isClubAdmin(this.user, await this.clubRepository.findByEntityID(court.club));
  }

  private async assertCanAccess(booking: Booking) {
    if (!(await this.canAccess(booking))) {
      throw new ForbiddenError();
    }
  }

  private async convertBookingModelToResponse(booking: Booking): Promise<BookingResponse> {
    const court = await this.courtRepository.findByEntityID(booking.court);
    const player = await this.playerRepository.findByEntityID(booking.player);
    const club = await this.clubRepository.findByEntityID(court.club);

    return {
      entityId: booking.entityId,
      clubName: club.name,
      clubAddress: club.address,
      clubCity: club.city,
      courtName: court.name,
      courtSurface: court.surface,
      from: booking.from,
      to: booking.to,
      totalPrice: booking.totalPrice,
      playerFirstName: player.firstName,
      playerLastName: player.lastName,
      bookingType: booking.bookingType,
      date: booking.date,
    } as BookingResponse;
  }
}
