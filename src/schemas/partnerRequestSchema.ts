import { Schema } from "redis-om";

const partnerRequestSchema = new Schema("PartnerRequest", {
  bookingId: { type: "string" },
  playerId: { type: "string" },
  playersNeeded: { type: "number" },
  joinedBy: { type: "string[]" },
  active: { type: "boolean" },
  level: { type: "string" },
  startsAt: { type: "number", sortable: true },
  uuid: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { partnerRequestSchema };
