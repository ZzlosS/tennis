import { Schema } from "redis-om";

const matchSchema = new Schema("Match", {
  uuid: { type: "string" },
  firstTeam: { type: "string[]" },
  secondTeam: { type: "string[]" },
  sets: { type: "string" },
  court: { type: "string" },
  status: { type: "string" },
  createdBy: { type: "string" },
  createdAt: { type: "number", sortable: true },
  playedAt: { type: "date" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { matchSchema };
