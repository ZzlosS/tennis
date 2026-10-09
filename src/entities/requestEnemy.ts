import BaseEntity from "./baseEntity";

type EnemyRequest = BaseEntity & {
  bookingEntityID: string;
  playerEntityID: string;
  numberOfPlayersNeeded: number;
  acceptedBy: string[];
  active: boolean;
};

export { EnemyRequest };
