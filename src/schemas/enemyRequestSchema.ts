import { Schema } from "redis-om";
import { EnemyRequest } from "../entities/requestEnemy";

let enemyRequestSchema = new Schema(EnemyRequest, {
  bookingEntityID: { type: "string" },
  playerEntityID: { type: "string" },
  numberOfPlayersNeeded: { type: "number" },
  acceptedBy: { type: "string[]" },
  active: { type: "boolean" },
  // Without these, soft delete and existence checks never saw the record.
  uuid: { type: "string" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { enemyRequestSchema };
