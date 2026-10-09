import { Schema } from "redis-om";

const courtBlockSchema = new Schema("CourtBlock", {
  uuid: { type: "string" },
  court: { type: "string" },
  startsAt: { type: "date", sortable: true },
  endsAt: { type: "date" },
  reason: { type: "string" },
  createdBy: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { courtBlockSchema };
