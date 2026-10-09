import RacketLevels from "../enums/racketLevels";
import BaseEntity from "./baseEntity";

type Racket = BaseEntity & {
  brand: string;
  model: string;
  year: number;
  weight: number;
  level: RacketLevels;
  headSizeInch: number;
  balance: number;
  stringPattern: string;
  recommendedStrings: string;
};

export { Racket };
