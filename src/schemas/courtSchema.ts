import { Schema } from "redis-om";

const courtSchema = new Schema("Court", {
  uuid: { type: "string" },
  name: { type: "string" },
  surface: { type: "string" },
  stands: { type: "boolean" },
  roof: { type: "boolean" },
  double: { type: "boolean" },
  club: { type: "string" },
  pricePerHour: { type: "number" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { courtSchema };
