import { Racket } from "../entities/racket";
import RacketLevels from "../enums/racketLevels";
import CreateRacketRequest from "../requests/createRacketRequest";
import UpdateRacketRequest from "../requests/updateRacketRequest";
import { racketSchema } from "../schemas/racketSchema";
import BaseRepository from "./baseRepository";

export default class RacketRepository extends BaseRepository<Racket> {
  constructor() {
    super(racketSchema);
  }

  // The rackets a player owns, skipping any that an admin has deleted from the catalog since.
  async getUserRackets(racketIds: string[]): Promise<Racket[]> {
    if (racketIds.length === 0) {
      return [];
    }
    await this.initializeRepository();
    const rackets = this.withIds(await this.repository.fetch(racketIds));
    return rackets.filter((racket) => racket.uuid != null && !racket.deleted);
  }

  async createRacket(request: CreateRacketRequest) {
    const racket = await this.createEntity();

    racket.brand = request.brand;
    racket.model = request.model;
    racket.year = request.year;
    racket.weight = request.weight;
    racket.level = request.level as RacketLevels;
    racket.headSizeInch = request.headSizeInch;
    racket.balance = request.balance;
    racket.stringPattern = request.stringPattern;
    racket.recommendedStrings = request.recommendedStrings ?? "";

    return await this.save(racket);
  }

  async updateRacket(entityId: string, updateRequest: UpdateRacketRequest) {
    const racket = await this.findByIdOrThrow(entityId, "Racket");

    if (updateRequest.brand) {
      racket.brand = updateRequest.brand;
    }
    if (updateRequest.model) {
      racket.model = updateRequest.model;
    }
    if (updateRequest.level) {
      racket.level = updateRequest.level;
    }
    if (updateRequest.year) {
      racket.year = updateRequest.year;
    }
    if (updateRequest.weight) {
      racket.weight = updateRequest.weight;
    }
    if (updateRequest.headSizeInch) {
      racket.headSizeInch = updateRequest.headSizeInch;
    }
    if (updateRequest.balance !== undefined) {
      racket.balance = updateRequest.balance;
    }
    if (updateRequest.stringPattern) {
      racket.stringPattern = updateRequest.stringPattern;
    }
    if (updateRequest.recommendedStrings !== undefined) {
      racket.recommendedStrings = updateRequest.recommendedStrings;
    }

    return await this.save(racket);
  }
}
