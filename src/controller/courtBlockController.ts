import { Request as ExRequest } from "express";
import {
  Body,
  Delete,
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
import { blockExample, blockPageExample } from "../http/examples";
import { ForbiddenError, NotFoundError } from "../errors/appError";
import { Page } from "../http/pagination";
import { currentUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import CourtBlockRepository from "../repositories/courtBlockRepository";
import CourtRepository from "../repositories/courtRepository";
import CreateBlockRequest from "../requests/createBlockRequest";
import BlockResponse from "../responses/blockResponse";
import { ErrorBody } from "../responses/common";
import BlockService from "../services/blockService";
import BookingService from "../services/bookingService";
import { now } from "../services/clock";
import Mapper from "../services/mappers";
import { AuthUser } from "../services/tokenService";
import { createBlockBody } from "../validation/blocks";

// Hours a club (or the owner of a court without a club) keeps free: a tournament, lessons, resurfacing.
@Tags("Court blocks")
@Route("courts/{courtId}/blocks")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class CourtBlockController {
  private courts = new CourtRepository();
  private blocks = new CourtBlockRepository();
  private service = new BlockService();
  private bookingService = new BookingService();
  private mapper = new Mapper();

  /**
   * Keeps the hours free. If some of them are already booked or blocked the answer is 409 SLOT_TAKEN and
   * `fields.slots` lists them; cancel those bookings first.
   */
  @Example(blockExample)
  @SuccessResponse(201, "Created")
  @Response<ErrorBody>(409, "SLOT_TAKEN")
  @Middlewares(validate({ body: createBlockBody }))
  @Post("/")
  async createBlock(
    @Request() req: ExRequest,
    @Path() courtId: string,
    @Body() request: CreateBlockRequest
  ): Promise<BlockResponse> {
    const user = currentUser(req);
    const court = await this.manageableCourt(user, courtId);
    return await this.mapper.block(await this.service.create(court, user.id, request));
  }

  /**
   * The court's blocks that have not ended yet, soonest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(blockPageExample)
  @Get("/")
  async getBlocks(
    @Request() req: ExRequest,
    @Path() courtId: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<Page<BlockResponse>> {
    await this.manageableCourt(currentUser(req), courtId);
    const { entities, nextCursor } = await this.blocks.findCourtBlocksPage(courtId, now(), { limit, cursor });
    return { items: await Promise.all(entities.map((block) => this.mapper.block(block))), nextCursor };
  }

  /** Frees the hours again. */
  @Delete("/{blockId}")
  async deleteBlock(@Request() req: ExRequest, @Path() courtId: string, @Path() blockId: string): Promise<void> {
    await this.manageableCourt(currentUser(req), courtId);
    const block = await this.blocks.findByIdOrThrow(blockId, "Block");
    if (block.court !== courtId) {
      throw new NotFoundError("Block not found");
    }
    await this.service.remove(block);
  }

  private async manageableCourt(user: AuthUser, courtId: string) {
    const court = await this.courts.findByIdOrThrow(courtId, "Court");
    if (!(await this.bookingService.canManage(user, court))) {
      throw new ForbiddenError();
    }
    return court;
  }
}
