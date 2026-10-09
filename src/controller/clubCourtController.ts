import { Request as ExRequest } from "express";
import {
  Body,
  Example,
  Get,
  Middlewares,
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
import { courtExample, courtPageExample } from "../http/examples";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import CourtCreateRequest from "../requests/courtCreateRequest";
import { ErrorBody } from "../responses/common";
import CourtResponse from "../responses/courtResponse";
import { assertClubAdmin } from "../services/access";
import Mapper from "../services/mappers";
import { createCourtBody } from "../validation/clubs";

// The courts of one club. Courts without a club are in CourtController.
@Tags("Courts")
@Route("clubs/{clubId}/courts")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class ClubCourtController {
  private clubs = new ClubRepository();
  private courts = new CourtRepository();
  private mapper = new Mapper();

  /**
   * The courts of a club, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(courtPageExample)
  @Get("/")
  async getClubCourts(
    @Path() clubId: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<CourtResponse>> {
    await this.clubs.findByIdOrThrow(clubId, "Club");
    const { entities, nextCursor } = await this.courts.findCourtsPage({ club: clubId }, { limit, cursor });
    return { items: await Promise.all(entities.map((court) => this.mapper.court(court))), nextCursor };
  }

  // Admins of the club, and ADMINs.
  @Example(courtExample)
  @SuccessResponse(201, "Created")
  @Security("jwt", ["CLUB_ADMIN"])
  @Middlewares(validate({ body: createCourtBody }))
  @Post("/")
  async createClubCourt(
    @Request() req: ExRequest,
    @Path() clubId: string,
    @Body() createCourt: CourtCreateRequest
  ): Promise<CourtResponse> {
    const club = await this.clubs.findByIdOrThrow(clubId, "Club");
    assertClubAdmin(currentUser(req), club);
    const id = await this.courts.createClubCourt(createCourt, club);
    return await this.mapper.court(await this.courts.findByIdOrThrow(id, "Court"));
  }
}
