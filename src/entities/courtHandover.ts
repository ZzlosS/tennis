import HandoverStatus from "../enums/handoverStatus";
import BaseEntity from "./baseEntity";

type CourtHandover = BaseEntity & {
  court: string;
  // The club asked to take the court over.
  club: string;
  requestedBy: string;
  status: HandoverStatus;
  // When it was answered (or cancelled), in ms; 0 while pending.
  decidedAt: number;
  decidedBy: string;
};

export { CourtHandover };
