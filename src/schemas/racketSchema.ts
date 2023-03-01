import { Schema } from "redis-om";
import { Racket } from "../entities/racket";

let racketSchema = new Schema(Racket, {
  uuid: {type: "string"},
  brand: {type: "string"},
  model: {type: "string"},
  year: {type: "number"},
  weight: {type: "number"},
  level: {type: "string"},
  headSizeInch: {type: "number"},
  balance: {type: "number"},
  stringPattern: {type: "string"},
  recommendedStrings: {type: "string"},
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { racketSchema };
