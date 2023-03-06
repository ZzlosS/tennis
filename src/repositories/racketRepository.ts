import RacketDto from "../dto/racketDto";
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

  async getRacketsByBrand(brand: string) {
    return await this.findAllByField(brand, "brand");
  }

  async getRacketsByLevel(level: RacketLevels) {
    return await this.findAllByField(level, "level");
  }

  async createRacket(data: RacketDto) {
    const racket = await this.createEntity();
    racket.brand = data.brand;
    racket.model = data.model;
    racket.year = data.year;
    racket.brand = data.brand;
    racket.level = data.level;
    racket.headSizeInch = data.headSizeInch;
    racket.balance = data.balance;
    racket.stringPattern = data.stringPattern;
    racket.recommendedStrings = data.recommendedStrings;
    console.log('🚀 ~ RacketRepository ~ createRacket ~ racket:', racket);
    return await this.save(racket);
  }
}
