import { Request as ExRequest } from "express";
import {
  Body,
  Delete,
  Example,
  Get,
  Middlewares,
  Patch,
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
  authExample,
  bookingPageExample,
  clubPageExample,
  courtPageExample,
  matchPageExample,
  meExample,
  statsExample,
} from "../http/examples";
import BookingWhen from "../enums/bookingWhen";
import AppError from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import MatchStatus from "../enums/matchStatus";
import { Page, pageOfArray } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import MatchRepository from "../repositories/matchRepository";
import PlayerRepository from "../repositories/playerRepository";
import ChangePasswordRequest from "../requests/changePasswordRequest";
import DeleteAccountRequest from "../requests/deleteAccountRequest";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import AuthResponse from "../responses/authResponse";
import BookingResponse from "../responses/bookingResponse";
import ClubResponse from "../responses/clubResponse";
import { ErrorBody } from "../responses/common";
import CourtResponse from "../responses/courtResponse";
import MatchResponse from "../responses/matchResponse";
import MeResponse from "../responses/meResponse";
import StatsResponse from "../responses/statsResponse";
import AccountService from "../services/accountService";
import { now } from "../services/clock";
import Mapper from "../services/mappers";
import StatsService from "../services/statsService";
import { hashPassword, verifyPassword } from "../services/passwordService";
import { issueSession } from "../services/sessionService";
import { revokeAllRefreshTokens } from "../services/tokenService";
import { changePasswordBody, deleteAccountBody, updatePlayerBody } from "../validation/auth";

// Everything about the logged-in player. The player always comes from the token.
@Tags("Me")
@Route("me")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
export class MeController {
  private players = new PlayerRepository();
  private bookings = new BookingRepository();
  private courts = new CourtRepository();
  private clubs = new ClubRepository();
  private accounts = new AccountService();
  private matches = new MatchRepository();
  private stats = new StatsService();
  private mapper = new Mapper();

  @Example(meExample)
  @Get("/")
  async getMe(@Request() req: ExRequest): Promise<MeResponse> {
    return this.mapper.me(await this.players.findByIdOrThrow(currentUser(req).id, "Player"));
  }

  @Example(meExample)
  @Middlewares(validate({ body: updatePlayerBody }))
  @Patch("/")
  async updateMe(@Request() req: ExRequest, @Body() updateRequest: UpdatePlayerRequest): Promise<MeResponse> {
    const { id } = currentUser(req);
    await this.players.updatePlayer(id, updateRequest);
    return this.mapper.me(await this.players.findByIdOrThrow(id, "Player"));
  }

  /**
   * Changes the password and ends every other session: all refresh tokens stop working. The answer holds a new
   * pair of tokens, so this device stays signed in. A wrong current password gives 403 INVALID_CREDENTIALS.
   */
  @Example(authExample)
  @Middlewares(validate({ body: changePasswordBody }))
  @Post("/password")
  async changePassword(@Request() req: ExRequest, @Body() request: ChangePasswordRequest): Promise<AuthResponse> {
    const player = await this.players.findByIdOrThrow(currentUser(req).id, "Player");
    if (!(await verifyPassword(request.currentPassword, player.password))) {
      throw new AppError(403, ErrorCode.INVALID_CREDENTIALS, "Wrong password");
    }
    player.password = await hashPassword(request.newPassword);
    await this.players.save(player);
    await revokeAllRefreshTokens(player.entityId);
    return await issueSession(player);
  }

  /**
   * Deletes the account. Bookings still to come are cancelled, courts the player owns are closed,
   * every session ends and the email can be used to sign up again. Asks for the password.
   */
  @SuccessResponse(204, "Deleted")
  @Middlewares(validate({ body: deleteAccountBody }))
  @Delete("/")
  async deleteMe(@Request() req: ExRequest, @Body() request: DeleteAccountRequest): Promise<void> {
    const player = await this.players.findByIdOrThrow(currentUser(req).id, "Player");
    if (!(await verifyPassword(request.password, player.password))) {
      throw new AppError(403, ErrorCode.INVALID_CREDENTIALS, "Wrong password");
    }
    await this.accounts.deleteAccount(player.entityId);
  }

  /**
   * Courts without a club that the player added, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(courtPageExample)
  @Get("/courts")
  async getMyCourts(
    @Request() req: ExRequest,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<CourtResponse>> {
    const { entities, nextCursor } = await this.courts.findCourtsPage(
      { ownerId: currentUser(req).id },
      { limit, cursor }
    );
    return { items: await Promise.all(entities.map((court) => this.mapper.court(court))), nextCursor };
  }

  /**
   * Clubs the player is an admin of, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(clubPageExample)
  @Get("/clubs")
  async getMyClubs(
    @Request() req: ExRequest,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<ClubResponse>> {
    const { entities, nextCursor } = await this.clubs.findClubsPageByAdmin(currentUser(req).id, { limit, cursor });
    return { items: await Promise.all(entities.map((club) => this.mapper.club(club))), nextCursor };
  }

  /**
   * Matches the player took part in, newest first, including those waiting for an answer.
   * @param status Only matches in this status.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(matchPageExample)
  @Get("/matches")
  async getMyMatches(
    @Request() req: ExRequest,
    @Query() status?: MatchStatus,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<MatchResponse>> {
    const matches = await this.matches.findPlayerMatches(currentUser(req).id, { status, newestFirst: true });
    return await pageOfArray(matches, { limit, cursor }, (match) => this.mapper.match(match));
  }

  /** Wins, losses, sets and games over the player's confirmed matches. */
  @Example(statsExample)
  @Get("/stats")
  async getMyStats(@Request() req: ExRequest): Promise<StatsResponse> {
    return await this.stats.get(currentUser(req).id);
  }

  /**
   * The player's own bookings. Upcoming ones (not yet ended) come soonest first, past ones newest first.
   * Cancelled bookings are left out.
   * @param when `upcoming` (default) or `past`.
   * @param seriesId Only the bookings made together by one weekly repeat.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(bookingPageExample)
  @Get("/bookings")
  async getMyBookings(
    @Request() req: ExRequest,
    @Query() when?: BookingWhen,
    @Query() seriesId?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<BookingResponse>> {
    const playerId = currentUser(req).id;
    const past = when === BookingWhen.PAST;
    const { entities, nextCursor } = await this.bookings.findBookingsPage(
      past ? { playerId, seriesId, to: now() } : { playerId, seriesId, endsAfter: now() },
      { limit, cursor },
      { field: "startsAt", descending: past }
    );
    return { items: await Promise.all(entities.map((booking) => this.mapper.booking(booking))), nextCursor };
  }
}
