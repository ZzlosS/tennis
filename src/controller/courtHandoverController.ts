import { Request as ExRequest } from "express";
import { Example, Get, Path, Post, Request, Response, Route, Security, Tags } from "tsoa";
import { CourtHandover } from "../entities/courtHandover";
import HandoverStatus from "../enums/handoverStatus";
import { ConflictError, ForbiddenError } from "../errors/appError";
import { handoverExample } from "../http/examples";
import { currentUser } from "../middleware/auth";
import ClubRepository from "../repositories/clubRepository";
import CourtHandoverRepository from "../repositories/courtHandoverRepository";
import CourtRepository from "../repositories/courtRepository";
import { COURT_NO_CLUB } from "../consts";
import { ErrorBody } from "../responses/common";
import HandoverResponse from "../responses/handoverResponse";
import { isAdmin, isClubAdmin } from "../services/access";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";

// A club's answer to "please take over this court". Ask for one with POST /courts/{id}/handover.
@Tags("Court handovers")
@Route("court-handovers")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class CourtHandoverController {
  private handovers = new CourtHandoverRepository();
  private courts = new CourtRepository();
  private clubs = new ClubRepository();
  private mapper = new Mapper();

  @Example(handoverExample)
  @Get("/{id}")
  async getHandover(@Request() req: ExRequest, @Path() id: string): Promise<HandoverResponse> {
    const handover = await this.handovers.findByIdOrThrow(id, "Handover");
    const user = currentUser(req);
    if (!(await this.isRequesterOrClub(user, handover))) {
      throw new ForbiddenError();
    }
    return await this.mapper.handover(handover);
  }

  /** The club agrees. The court becomes a club court, managed by the club's admins from then on. */
  @Example(handoverExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Post("/{id}/accept")
  async accept(@Request() req: ExRequest, @Path() id: string): Promise<HandoverResponse> {
    const user = currentUser(req);
    const handover = await this.handovers.findByIdOrThrow(id, "Handover");
    const club = await this.clubs.findByIdOrThrow(handover.club, "Club");
    if (!isClubAdmin(user, club)) {
      throw new ForbiddenError();
    }
    const court = await this.courts.findByIdOrThrow(handover.court, "Court");
    if (court.club !== COURT_NO_CLUB) {
      throw new ConflictError("This court already belongs to a club");
    }
    await this.answer(id, HandoverStatus.ACCEPTED, user);
    await this.courts.assignToClub(court.entityId, club);
    return await this.mapper.handover(await this.handovers.findByIdOrThrow(id, "Handover"));
  }

  /** The club says no. The court stays as it was. */
  @Example(handoverExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Post("/{id}/decline")
  async decline(@Request() req: ExRequest, @Path() id: string): Promise<HandoverResponse> {
    const user = currentUser(req);
    const handover = await this.handovers.findByIdOrThrow(id, "Handover");
    if (!isClubAdmin(user, await this.clubs.findByIdOrThrow(handover.club, "Club"))) {
      throw new ForbiddenError();
    }
    await this.answer(id, HandoverStatus.DECLINED, user);
    return await this.mapper.handover(await this.handovers.findByIdOrThrow(id, "Handover"));
  }

  /** The owner takes the request back. */
  @Example(handoverExample)
  @Response<ErrorBody>(409, "CONFLICT")
  @Post("/{id}/cancel")
  async cancel(@Request() req: ExRequest, @Path() id: string): Promise<HandoverResponse> {
    const user = currentUser(req);
    const handover = await this.handovers.findByIdOrThrow(id, "Handover");
    if (!isAdmin(user) && handover.requestedBy !== user.id) {
      throw new ForbiddenError();
    }
    await this.answer(id, HandoverStatus.CANCELLED, user);
    return await this.mapper.handover(await this.handovers.findByIdOrThrow(id, "Handover"));
  }

  // Only a pending request can be answered, and only once.
  private async answer(id: string, status: HandoverStatus, user: AuthUser) {
    if (!(await this.handovers.answer(id, status, user.id))) {
      throw new ConflictError("This request has already been answered");
    }
  }

  private async isRequesterOrClub(user: AuthUser, handover: CourtHandover): Promise<boolean> {
    if (isAdmin(user) || handover.requestedBy === user.id) {
      return true;
    }
    return isClubAdmin(user, await this.clubs.findByEntityID(handover.club));
  }
}
