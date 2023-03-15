import { Schema } from "redis-om";
import { Match } from "../entities/match";

let matchSchema = new Schema(Match, {
  uuid: { type: "string" },
  firstTeam: { type: "string[]" },
  secondTeam: { type: "string[]" },
  result: { type: "string[]" },
  court: { type: "string" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { matchSchema };
