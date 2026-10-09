import { z } from "zod";
import RacketLevels from "../enums/racketLevels";
import { id, text } from "./common";

export const createRacketBody = z.object({
  brand: text(100),
  model: text(100),
  year: z.number().int().min(1900).max(2100),
  weight: z.number().positive().max(1000),
  level: z.nativeEnum(RacketLevels),
  headSizeInch: z.number().positive().max(200),
  balance: z.number().min(-100).max(100),
  stringPattern: text(20),
  recommendedStrings: z.string().trim().max(200).default(""),
});

export const updateRacketBody = createRacketBody.partial();

export const assignRacketBody = z.object({
  racketEid: id,
});
