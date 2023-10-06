import RacketLevels from "../enums/racketLevels";

export default interface UpdateRacketRequest {
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