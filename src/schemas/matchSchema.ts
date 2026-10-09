import { Schema } from "redis-om";

const matchSchema = new Schema("Match", {
  uuid: { type: "string" },
  firstTeam: { type: "string[]" },
  secondTeam: { type: "string[]" },
  result: { type: "string[]" },
  court: { type: "string" },
  createdAt: { type: "number" },
  date: { type: "date" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { matchSchema };
