import BaseEntity from "./baseEntity";

interface EnemyRequest {
  bookingEntityID: string;
  playerEntityID: string;
  numberOfPlayersNeeded: number;
  acceptedBy: string[];
  active: boolean;
}

class EnemyRequest extends BaseEntity {}
export { EnemyRequest };
