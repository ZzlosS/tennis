import { Tags, Route, Get, Path, Post, Body, Query, Delete, Patch, Security } from "tsoa";
import CourtRepository from "../repositories/courtRepository";
import CourtResponse from "../responses/courtResponse";
import CourtCreateRequest from "../requests/courtCreateRequest";
import ClubRepository from "../repositories/clubRepository";
import ClubResponse from "../responses/clubResponse";
import AssignCourtRequest from "../requests/assignCourtRequest";
import { Court } from "../entities/court";
import UpdateCourtRequest from "../requests/updateCourtRequest";
import { COURT_UNASSIGNED_CLUB } from "../consts";
import Role from "../enums/role";
import { ForbiddenError } from "../errors/appError";
import { assertClubAdmin, isAdmin, requireRole } from "../services/access";
import { AuthUser } from "../services/tokenService";

@Tags("Courts")
@Route("courts")
export default class CourtController {
  repository: CourtRepository;
  clubRepository: ClubRepository;
  user: AuthUser;

  constructor(user: AuthUser) {
    this.repository = new CourtRepository();
    this.clubRepository = new ClubRepository();
    this.user = user;
  }

  @Security("jwt")
  @Get("/all")
  async getAllCourts(): Promise<CourtResponse[]> {
    const courts = await this.repository.findAll();
    return await Promise.all(courts.map((court) => this.convertCourtModelToResponse(court)));
  }

  @Security("jwt")
  @Get("/{entityId}")
  async getById(@Path() entityId: string): Promise<CourtResponse> {
    const court = await this.repository.findByIdOrThrow(entityId, "Court");
    const club = await this.clubRepository.findByEntityID(court.club);

    const clubResponse = {
      name: club.name,
      address: club.address,
      description: club.description,
      city: club.city,
      country: club.country,
      courtsNumber: club.courts,
    } as ClubResponse;

    return {
      entityId: court.entityId,
      name: court.name,
      surface: court.surface,
      stands: court.stands,
      roof: court.roof,
      double: court.double,
      club: clubResponse,
      clubId: court.club,
      pricePerHour: court.pricePerHour,
    } as CourtResponse;
  }

  // Club admins create courts directly in their own club; only an ADMIN may leave a court unassigned.
  @Security("jwt")
  @Post("/")
  async createCourt(@Body() createCourt: CourtCreateRequest): Promise<any> {
    requireRole(this.user, Role.CLUB_ADMIN);

    let courtEntityID: string;
    if (createCourt.clubId) {
      assertClubAdmin(this.user, await this.clubRepository.findByIdOrThrow(createCourt.clubId, "Club"));
      courtEntityID = await this.repository.createCourt(createCourt, createCourt.clubId);
      await this.clubRepository.incrementClubCourtCount(createCourt.clubId);
    } else {
      requireRole(this.user, Role.ADMIN);
      courtEntityID = await this.repository.createCourt(createCourt);
    }

    return { entityId: courtEntityID };
  }

  @Security("jwt")
  @Get("/unassigned")
  async getUnassignedCourts(): Promise<CourtResponse[]> {
    const courts = await this.repository.findUnassignedCourts();
    return await Promise.all(courts.map((court) => this.convertCourtModelToResponse(court)));
  }

  // The caller must administer the target club, and the court must be unassigned or in a club they administer.
  @Security("jwt")
  @Post("/assign")
  async assignCourtToClub(@Body() assignRequest: AssignCourtRequest): Promise<boolean> {
    const court = await this.repository.findByIdOrThrow(assignRequest.courtEntityID, "Court");
    const targetClub = await this.clubRepository.findByIdOrThrow(assignRequest.clubEntityID, "Club");
    assertClubAdmin(this.user, targetClub);
    if (court.club !== COURT_UNASSIGNED_CLUB) {
      await this.assertCanManage(court);
    }

    if (court.club === targetClub.entityId) {
      return true;
    }
    if (court.club !== COURT_UNASSIGNED_CLUB) {
      await this.clubRepository.decrementClubCourtCount(court.club);
    }
    await this.repository.assignToClub(assignRequest.courtEntityID, assignRequest.clubEntityID);
    await this.clubRepository.incrementClubCourtCount(assignRequest.clubEntityID);

    return true;
  }

  @Security("jwt")
  @Get("/price")
  async findByPrice(@Query() from: number, @Query() to: number): Promise<CourtResponse[]> {
    const courts = await this.repository.findByPrice(from, to);
    return await Promise.all(courts.map((court) => this.convertCourtModelToResponse(court)));
  }

  @Security("jwt")
  @Delete("/{entityId}")
  async deleteCourt(@Path() entityId: string): Promise<string> {
    const court = await this.repository.findByIdOrThrow(entityId, "Court");
    await this.assertCanManage(court);
    const result = await this.repository.deleteEntity(entityId);
    if (court.club !== COURT_UNASSIGNED_CLUB) {
      await this.clubRepository.decrementClubCourtCount(court.club);
    }
    return result;
  }

  @Security("jwt")
  @Patch("/{entityId}")
  async updateCourt(@Body() updateRequest: UpdateCourtRequest, @Path() entityId: string): Promise<string> {
    await this.assertCanManage(await this.repository.findByIdOrThrow(entityId, "Court"));
    return await this.repository.updateCourt(entityId, updateRequest);
  }

  // Admins of the court's club, or an ADMIN. An unassigned court belongs to ADMINs only.
  private async assertCanManage(court: Court) {
    if (isAdmin(this.user)) {
      return;
    }
    if (court.club === COURT_UNASSIGNED_CLUB) {
      throw new ForbiddenError();
    }
    assertClubAdmin(this.user, await this.clubRepository.findByIdOrThrow(court.club, "Club"));
  }

  async convertCourtModelToResponse(court: Court): Promise<CourtResponse> {
    return {
      entityId: court.entityId,
      name: court.name,
      surface: court.surface,
      stands: court.stands,
      roof: court.roof,
      double: court.double,
      clubId: court.club,
      pricePerHour: court.pricePerHour,
    } as CourtResponse;
  }
}
