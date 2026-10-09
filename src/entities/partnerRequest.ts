import BaseEntity from "./baseEntity";

type PartnerRequest = BaseEntity & {
  bookingId: string;
  playerId: string;
  playersNeeded: number;
  joinedBy: string[];
  active: boolean;
  // The level asked for, or ANY.
  level: string;
  // When the booking starts, copied here so requests can be filtered and sorted by it; ms.
  startsAt: number;
};

export { PartnerRequest };
