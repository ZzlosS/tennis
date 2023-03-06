import { Schema } from "redis-om";
import { Club } from "../entities/club";

let courtSchema = new Schema(Club, {
  uuid: { type: "string" },
  name: { type: "string" },
  address: { type: "string" },
  description: { type: "text" },
  city: { type: "string" },
  country: { type: "string" },
  courts: { type: "number" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});
