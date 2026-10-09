import { Schema } from "redis-om";

const courtHandoverSchema = new Schema("CourtHandover", {
  uuid: { type: "string" },
  court: { type: "string" },
  club: { type: "string" },
  requestedBy: { type: "string" },
  status: { type: "string" },
  decidedAt: { type: "number" },
  decidedBy: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { courtHandoverSchema };
