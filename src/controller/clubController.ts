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
import { clubDetailExample, clubExample, clubPageExample, clubScheduleExample } from "../http/examples";
import { Booking } from "../entities/booking";
import { CourtBlock } from "../entities/courtBlock";
import { ValidationError } from "../errors/appError";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import BookingRepository from "../repositories/bookingRepository";
import CourtBlockRepository from "../repositories/courtBlockRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import ClubCreateRequest from "../requests/clubCreateRequest";
import UpdateClubRequest from "../requests/updateClubRequest";
import ClubResponse, { ClubDetailResponse } from "../responses/clubResponse";
import ClubScheduleResponse, { ScheduleSlot } from "../responses/clubScheduleResponse";
import { ErrorBody, PlayerSummary } from "../responses/common";
import { assertClubAdmin } from "../services/access";
import BookingService from "../services/bookingService";
import Mapper from "../services/mappers";
import { DEFAULT_TIME_ZONE, isIsoDate } from "../services/time";
import { createClubBody, updateClubBody } from "../validation/clubs";

@Tags("Clubs")
@Route("clubs")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class ClubController {
  private repository = new ClubRepository();
  private courtRepository = new CourtRepository();
  private mapper = new Mapper();
  private bookingService = new BookingService();
  private bookingRepository = new BookingRepository();
  private blockRepository = new CourtBlockRepository();

  /**
   * Clubs, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(clubPageExample)
  @Get("/")
  async getClubs(
    @Query() city?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<ClubResponse>> {
    const { entities, nextCursor } = await this.repository.findClubsPage(city, { limit, cursor });
    return { items: await Promise.all(entities.map((club) => this.mapper.club(club))), nextCursor };
  }

  @Example(clubExample)
  @SuccessResponse(201, "Created")
  @Security("jwt", ["ADMIN"])
  @Middlewares(validate({ body: createClubBody }))
  @Post("/")
  async createClub(@Body() createClub: ClubCreateRequest): Promise<ClubResponse> {
    const id = await this.repository.createClub(createClub);
    return await this.mapper.club(await this.repository.findByIdOrThrow(id, "Club"));
  }

  @Example(clubDetailExample)
  @Get("/{id}")
  async getClub(@Path() id: string): Promise<ClubDetailResponse> {
    const club = await this.repository.findByIdOrThrow(id, "Club");
    const courts = await this.courtRepository.findClubCourts(id);
    return {
      ...(await this.mapper.club(club)),
      courts: await Promise.all(courts.map((court) => this.mapper.court(court))),
    };
  }

  /**
   * One day of the club, hour by hour on every court, with who booked each hour and whether it was paid.
   * For the club's admins.
   * @param date The day in the club's time zone, "YYYY-MM-DD".
   */
  @Example(clubScheduleExample)
  @Get("/{id}/schedule")
  async getSchedule(
    @Request() req: ExRequest,
    @Path() id: string,
    @Query() date: string
  ): Promise<ClubScheduleResponse> {
    if (!isIsoDate(date)) {
      throw new ValidationError("Validation failed", { date: ["Must be a date such as 2026-11-01"] });
    }
    const club = await this.repository.findByIdOrThrow(id, "Club");
    assertClubAdmin(currentUser(req), club);

    const players = new Map<string, Promise<PlayerSummary>>();
    const bookings = new Map<string, Promise<Booking>>();
    const blocks = new Map<string, Promise<CourtBlock>>();
    const once = <T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>) => {
      if (!cache.has(key)) cache.set(key, load());
      return cache.get(key)!;
    };

    const courts = await Promise.all(
      (await this.courtRepository.findClubCourts(id)).map(async (court) => {
        const { schedule, slots } = await this.bookingService.availability(court, date);
        return {
          court: this.mapper.courtSummary(court),
          active: schedule.active,
          slots: await Promise.all(
            slots.map(async (slot): Promise<ScheduleSlot> => {
              const base = {
                startsAt: slot.startsAt.toISOString(),
                endsAt: slot.endsAt.toISOString(),
                localTime: slot.localTime,
                status: slot.status,
              };
              if (slot.holder?.kind === "b") {
                const booking = await once(bookings, slot.holder.id, () =>
                  this.bookingRepository.findByEntityID(slot.holder!.id)
                );
                const player = await once(players, booking.player, () => this.mapper.playerSummary(booking.player));
                return {
                  ...base,
                  booking: {
                    id: booking.entityId,
                    player,
                    paidAt: booking.paidAt ? new Date(booking.paidAt).toISOString() : null,
                    seriesId: booking.seriesId || null,
                  },
                  block: null,
                };
              }
              if (slot.holder?.kind === "x") {
                const block = await once(blocks, slot.holder.id, () =>
                  this.blockRepository.findByEntityID(slot.holder!.id)
                );
                return { ...base, booking: null, block: { id: block.entityId, reason: block.reason ?? "" } };
              }
              return { ...base, booking: null, block: null };
            })
          ),
        };
      })
    );
    return { clubId: id, date, timeZone: club.timeZone || DEFAULT_TIME_ZONE, courts };
  }

  @Example(clubExample)
  @Middlewares(validate({ body: updateClubBody }))
  @Patch("/{id}")
  async updateClub(
    @Request() req: ExRequest,
    @Path() id: string,
    @Body() updateRequest: UpdateClubRequest
  ): Promise<ClubResponse> {
    assertClubAdmin(currentUser(req), await this.repository.findByIdOrThrow(id, "Club"));
    await this.repository.updateClub(id, updateRequest);
    const club = await this.repository.findByIdOrThrow(id, "Club");
    // The courts copy the club's place and currency, so they follow it.
    await this.courtRepository.syncClubDetails(club);
    return await this.mapper.club(club);
  }

  @Delete("/{id}")
  async deleteClub(@Request() req: ExRequest, @Path() id: string): Promise<void> {
    assertClubAdmin(currentUser(req), await this.repository.findByIdOrThrow(id, "Club"));
    await this.repository.deleteEntity(id);
  }
}
