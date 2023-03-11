import RacketDto from "../dtos/racketDto";
import { Racket } from "../entities/racket";
import RacketLevels from "../enums/racketLevels";
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

  async findRacketsByBrand(brand: string) {
    return await this.findAllByField(brand, "brand");
  }

  async findRacketsByLevel(level: RacketLevels) {
    return await this.findAllByField(level, "level");
  }

  async createRacket(dto: RacketDto) {
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

}
