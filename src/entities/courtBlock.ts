import BaseEntity from "./baseEntity";

// Hours of a court that a club admin (or the owner) keeps free for something other than bookings.
type CourtBlock = BaseEntity & {
  court: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdBy: string;
};

export { CourtBlock };
