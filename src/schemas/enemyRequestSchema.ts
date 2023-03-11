import { Schema } from "redis-om";
import { EnemyRequest } from "../entities/requestEnemy";

let enemyRequestSchema = new Schema(EnemyRequest, {
  bookingEntityID: { type: "string" },
  playerEntityID: { type: "string" },
  numberOfPlayersNeeded: { type: "number" },
  acceptedBy: { type: "string[]" },
  active: { type: "boolean" },
});

export { enemyRequestSchema };
