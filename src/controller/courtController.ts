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
import {
  availabilityExample,
  courtExample,
  courtPageExample,
  handoverExample,
  publicCourtExample,
  publicCourtPageExample,
} from "../http/examples";
import { COURT_NO_CLUB } from "../consts";
import { Court } from "../entities/court";
import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import { ConflictError, ForbiddenError, ValidationError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import CourtHandoverRepository from "../repositories/courtHandoverRepository";
import HandoverResponse from "../responses/handoverResponse";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import AssignCourtRequest from "../requests/assignCourtRequest";
import StandaloneCourtCreateRequest from "../requests/standaloneCourtCreateRequest";
import UpdateCourtRequest from "../requests/updateCourtRequest";
import { ErrorBody } from "../responses/common";
import AvailabilityResponse from "../responses/availabilityResponse";
import CourtResponse from "../responses/courtResponse";
import { assertClubAdmin, assertSelfOrAdmin, isAdmin } from "../services/access";
import BookingService from "../services/bookingService";
import Mapper from "../services/mappers";
import Notifier from "../services/notifier";
import { isIsoDate } from "../services/time";
import { AuthUser } from "../services/tokenService";
import { assignCourtBody, createStandaloneCourtBody, updateCourtBody } from "../validation/clubs";

// Courts of any kind. A club court is managed by its club's admins. A public or private court has no club:
// the player who added it manages it until they hand it over to a club.
@Tags("Courts")
@Route("courts")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class CourtController {
  private repository = new CourtRepository();
  private clubRepository = new ClubRepository();
  private mapper = new Mapper();
  private bookingService = new BookingService();
  private handovers = new CourtHandoverRepository();
  private notifier = new Notifier();

  /**
   * Courts of every kind, oldest first.
   * @param kind CLUB, PUBLIC or PRIVATE.
   * @param minPrice Lowest price per hour, in minor units.
   * @param maxPrice Highest price per hour, in minor units.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(courtPageExample)
  @Get("/")
  async getCourts(
    @Query() kind?: CourtKind,
    @Query() city?: string,
    @Query() surface?: CourtSurface,
    @Query() minPrice?: number,
    @Query() maxPrice?: number,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<CourtResponse>> {
    const { entities, nextCursor } = await this.repository.findCourtsPage(
      { kind, city, surface, minPrice, maxPrice },
      { limit, cursor }
    );
    return { items: await Promise.all(entities.map((court) => this.mapper.court(court))), nextCursor };
  }

  /**
   * Public and private courts, the ones that have no club.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(publicCourtPageExample)
  @Get("/unassigned")
  async getUnassignedCourts(
    @Query() city?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<CourtResponse>> {
    const { entities, nextCursor } = await this.repository.findCourtsPage(
      { club: COURT_NO_CLUB, city },
      { limit, cursor }
    );
    return { items: await Promise.all(entities.map((court) => this.mapper.court(court))), nextCursor };
  }

  // Any logged-in player can add one; they become its owner.
  @Example(publicCourtExample)
  @SuccessResponse(201, "Created")
  @Middlewares(validate({ body: createStandaloneCourtBody }))
  @Post("/")
  async createCourt(
    @Request() req: ExRequest,
    @Body() createCourt: StandaloneCourtCreateRequest
  ): Promise<CourtResponse> {
    const id = await this.repository.createStandaloneCourt(createCourt, currentUser(req).id);
    return await this.mapper.court(await this.repository.findByIdOrThrow(id, "Court"));
  }

  /**
   * Every hour of one local day of a court: FREE, BOOKED, BLOCKED (held by the club) or CLOSED
   * (outside opening hours, the court is closed, or the hour is already past).
   * @param date The day in the court's own time zone, "YYYY-MM-DD".
   */
  @Example(availabilityExample)
  @Get("/{id}/availability")
  async getAvailability(@Path() id: string, @Query() date: string): Promise<AvailabilityResponse> {
    if (!isIsoDate(date)) {
      throw new ValidationError("Validation failed", { date: ["Must be a date such as 2026-11-01"] });
    }
    const court = await this.repository.findByIdOrThrow(id, "Court");
    const { schedule, price, slots } = await this.bookingService.availability(court, date);
    return {
      courtId: id,
      date,
      timeZone: schedule.timeZone,
      pricePerHour: price,
      slots: slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        localTime: slot.localTime,
        status: slot.status,
      })),
    };
  }

  @Example(courtExample)
  @Get("/{id}")
  async getCourt(@Path() id: string): Promise<CourtResponse> {
    return await this.mapper.court(await this.repository.findByIdOrThrow(id, "Court"));
  }

  /**
   * Asks a club to take over a public or private court. The court's owner (or an ADMIN) asks, and the club's
   * admins accept or decline; nothing changes until they accept. One request per court at a time.
   */
  @Example(handoverExample)
  @SuccessResponse(201, "Created")
  @Response<ErrorBody>(409, "HANDOVER_PENDING")
  @Middlewares(validate({ body: assignCourtBody }))
  @Post("/{id}/handover")
  async requestHandover(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() request: AssignCourtRequest
  ): Promise<HandoverResponse> {
    const user = currentUser(req);
    const court = await this.repository.findByIdOrThrow(id, "Court");
    await this.clubRepository.findByIdOrThrow(request.clubId, "Club");
    if (court.club !== COURT_NO_CLUB) {
      throw new ConflictError("This court already belongs to a club");
    }
    assertSelfOrAdmin(user, court.ownerId);
    if (await this.handovers.findPendingForCourt(id)) {
      throw new ConflictError("This court already has a handover waiting for an answer", ErrorCode.HANDOVER_PENDING);
    }
    const handoverId = await this.handovers.createHandover(id, request.clubId, user.id);
    const club = await this.clubRepository.findByIdOrThrow(request.clubId, "Club");
    await this.notifier.notify(
      club.admins ?? [],
      "HANDOVER_REQUESTED",
      { who: (await this.mapper.playerSummary(user.id)).nickname, court: court.name, club: club.name },
      { handoverId }
    );
    return await this.mapper.handover(await this.handovers.findByIdOrThrow(handoverId, "Handover"));
  }

  // Hands a public or private court to a club straight away, without the club's consent. Only for ADMINs, to fix
  // things up; everyone else uses the handover request.
  @Example(courtExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Middlewares(validate({ body: assignCourtBody }))
  @Post("/{id}/assign")
  async assignCourtToClub(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() assignRequest: AssignCourtRequest
  ): Promise<CourtResponse> {
    const court = await this.repository.findByIdOrThrow(id, "Court");
    const club = await this.clubRepository.findByIdOrThrow(assignRequest.clubId, "Club");
    if (court.club !== COURT_NO_CLUB) {
      throw new ConflictError("This court already belongs to a club");
    }
    if (!isAdmin(currentUser(req))) {
      throw new ForbiddenError("Ask the club to take the court over with a handover request");
    }

    await this.repository.assignToClub(id, club);
    return await this.mapper.court(await this.repository.findByIdOrThrow(id, "Court"));
  }

  @Example(courtExample)
  @Middlewares(validate({ body: updateCourtBody }))
  @Patch("/{id}")
  async updateCourt(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateCourtRequest
  ): Promise<CourtResponse> {
    const court = await this.repository.findByIdOrThrow(id, "Court");
    await this.assertCanManage(currentUser(req), court);

    // A club court takes its place and currency from the club.
    if (court.club !== COURT_NO_CLUB) {
      const fields = Object.fromEntries(
        (["address", "city", "country", "currency", "timeZone", "latitude", "longitude"] as const)
          .filter((field) => updateRequest[field] !== undefined)
          .map((field) => [field, ["Change this on the club, not on its court"]])
      );
      if (Object.keys(fields).length > 0) {
        throw new ValidationError("Validation failed", fields);
      }
    }

    await this.repository.updateCourt(id, updateRequest);
    return await this.mapper.court(await this.repository.findByIdOrThrow(id, "Court"));
  }

  @Delete("/{id}")
  async deleteCourt(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    await this.assertCanManage(currentUser(req), await this.repository.findByIdOrThrow(id, "Court"));
    await this.repository.deleteEntity(id);
  }

  // A club court: admins of its club, or an ADMIN. A public or private court: its owner, or an ADMIN.
  private async assertCanManage(user: AuthUser, court: Court) {
    if (court.club === COURT_NO_CLUB) {
      return assertSelfOrAdmin(user, court.ownerId);
    }
    assertClubAdmin(user, await this.clubRepository.findByIdOrThrow(court.club, "Club"));
  }
}
