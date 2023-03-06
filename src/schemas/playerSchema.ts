import { Schema } from "redis-om";
import { Player } from "../entities/player";

let playerSchema = new Schema(Player, {
  uuid: { type: "string" },
  firstName: { type: "string" },
  lastName: { type: "string" },
  email: { type: "string" },
  nickname: { type: "string" },
  level: { type: "string" },
  rackets: { type: "string[]" },
  address: { type: "string" },
  city: { type: "string" },
  country: { type: "string" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { playerSchema };