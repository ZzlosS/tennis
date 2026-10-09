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
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { racketExample, racketPageExample } from "../http/examples";
import { Page } from "../http/pagination";
import { validate } from "../middleware/validate";
import RacketRepository from "../repositories/racketRepository";
import CreateRacketRequest from "../requests/createRacketRequest";
import UpdateRacketRequest from "../requests/updateRacketRequest";
import { ErrorBody } from "../responses/common";
import RacketResponse from "../responses/racketResponse";
import Mapper from "../services/mappers";
import { createRacketBody, updateRacketBody } from "../validation/rackets";

// The shared catalog of rackets. Everyone can read it; only ADMINs change it.
@Tags("Rackets")
@Route("rackets")
@Security("jwt")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
@Response<ErrorBody>(401, "UNAUTHENTICATED")
@Response<ErrorBody>(403, "FORBIDDEN")
@Response<ErrorBody>(404, "NOT_FOUND")
export class RacketController {
  private repository = new RacketRepository();
  private mapper = new Mapper();

  /**
   * The racket catalog, oldest first.
   * @param limit Page size, 1 to 100. Default 20.
   * @param cursor The nextCursor of the previous page.
   */
  @Example(racketPageExample)
  @Get("/")
  async getRackets(@Query() limit?: number, @Query() cursor?: string): Promise<Page<RacketResponse>> {
    const { entities, nextCursor } = await this.repository.findPage((search) => search, { limit, cursor });
    return { items: entities.map((racket) => this.mapper.racket(racket)), nextCursor };
  }

  @Example(racketExample)
  @Get("/{id}")
  async getRacket(@Path() id: string): Promise<RacketResponse> {
    return this.mapper.racket(await this.repository.findByIdOrThrow(id, "Racket"));
  }

  @Example(racketExample)
  @SuccessResponse(201, "Created")
  @Security("jwt", ["ADMIN"])
  @Middlewares(validate({ body: createRacketBody }))
  @Post("/")
  async createRacket(@Body() createRacket: CreateRacketRequest): Promise<RacketResponse> {
    const id = await this.repository.createRacket(createRacket);
    return this.mapper.racket(await this.repository.findByIdOrThrow(id, "Racket"));
  }

  @Example(racketExample)
  @Security("jwt", ["ADMIN"])
  @Middlewares(validate({ body: updateRacketBody }))
  @Patch("/{id}")
  async updateRacket(@Path() id: string, @Body() updateRequest: UpdateRacketRequest): Promise<RacketResponse> {
    await this.repository.updateRacket(id, updateRequest);
    return this.mapper.racket(await this.repository.findByIdOrThrow(id, "Racket"));
  }

  @Security("jwt", ["ADMIN"])
  @Delete("/{id}")
  async deleteRacket(@Path() id: string): Promise<void> {
    await this.repository.deleteEntity(id);
  }
}
