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
import { clubDetailExample, clubExample, clubPageExample } from "../http/examples";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import ClubCreateRequest from "../requests/clubCreateRequest";
import UpdateClubRequest from "../requests/updateClubRequest";
import ClubResponse, { ClubDetailResponse } from "../responses/clubResponse";
import { ErrorBody } from "../responses/common";
import { assertClubAdmin } from "../services/access";
import Mapper from "../services/mappers";
import { createClubBody, updateClubBody } from "../validation/clubs";

@Tags("Clubs")
@Route("clubs")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class ClubController {
  private repository = new ClubRepository();
  private courtRepository = new CourtRepository();
  private mapper = new Mapper();

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
