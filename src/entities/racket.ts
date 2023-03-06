import RacketLevels from "../enums/racketLevels";
import BaseEntity from "./baseEntity";

interface Racket {
  brand: string;
  model: string;
  year: number;
  weight: number;
  level: RacketLevels;
  headSizeInch: number;
  balance: number;
  stringPattern: string;
  recommendedStrings: string;
}

class Racket extends BaseEntity {}
export { Racket };
