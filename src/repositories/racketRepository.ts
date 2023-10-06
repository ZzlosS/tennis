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

  async getUserRackets(racketsArray: string[]): Promise<Racket[]> {
    let rackets: Racket[] = [];
    try {
      await this.initializeRepository();
      rackets = await this.repository.fetch(racketsArray);
    } catch (error) {
      console.log("🚀 ~ RacketRepository ~ getUserRackets ~ error:", error);
    }
    return rackets;
  }

  async createRacket(dto: CreateRacketRequest) {
    const racket = await this.createEntity();

    racket.brand = dto.brand;
    racket.model = dto.model;
    racket.year = dto.year;
    racket.brand = dto.brand;
    racket.level = dto.level;
    racket.headSizeInch = dto.headSizeInch;
    racket.balance = dto.balance;
    racket.stringPattern = dto.stringPattern;
    racket.recommendedStrings = dto.recommendedStrings;

    return await this.save(racket);
  }

  async updateRacket(entityId: string, updateRequest: UpdateRacketRequest) {
    const racket = await this.findByEntityID(entityId);

    if(updateRequest.brand){
      racket.brand = updateRequest.brand;
    }
    if(updateRequest.model){
      racket.model = updateRequest.model;
    }
    if(updateRequest.level){
      racket.level = updateRequest.level;
    }
    if(updateRequest.year){
      racket.year = updateRequest.year;
    }
    if(updateRequest.weight){
      racket.weight = updateRequest.weight;
    }
    if(updateRequest.headSizeInch){
      racket.headSizeInch = updateRequest.headSizeInch;
    }
    if(updateRequest.balance){
      racket.balance = updateRequest.balance;
    }
    if(updateRequest.stringPattern){
      racket.stringPattern = updateRequest.stringPattern;
    }
    if(updateRequest.recommendedStrings){
      racket.recommendedStrings = updateRequest.recommendedStrings;
    }

    return await this.save(racket);
  }
}
