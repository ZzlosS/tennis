import BaseEntity from "./baseEntity";

type PartnerRequest = BaseEntity & {
  bookingId: string;
  playerId: string;
  playersNeeded: number;
  joinedBy: string[];
  active: boolean;
};

export { PartnerRequest };
