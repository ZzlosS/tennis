import { Schema } from "redis-om";
import { Court } from "../entities/court";

let courtSchema = new Schema(Court, {
  uuid: { type: "string" },
  name: { type: "boolean" },
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
